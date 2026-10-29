import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// 👈 把 channel 放到模块外部，保证全局唯一
let channel: RealtimeChannel | null = null;

export function useClassroomSync() {
    const joinRoom = (onReceive: (event: string, payload: any) => void) => {
        // 徹底斷開舊連線
        if (channel) {
            console.log('🔌 [Sync] 移除舊的 WebSocket 連線');
            supabase.removeChannel(channel);
            channel = null;
        }

        // 建立全新的唯一連線
        const channelName = `classroom_sync_${Date.now()}`;
        console.log(`📡 [Sync] 建立新的 WebSocket 連線: ${channelName}`);

        channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'classroom_state' },
                (payload) => {
                    console.log('📡 [Sync] 偵測到資料庫狀態更新:', payload.new);
                    const newState = payload.new;

                    onReceive('SYNC_STATE', {
                        id: newState.current_question_id,
                        timerEndTime: newState.timer_end_time
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [Sync] 已連線至資料庫變更監聽');
                    syncState(onReceive);
                }
            });

        const handleVisibilityChange = () => {
            if (!document.hidden) syncState(onReceive);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        (channel as any)._cleanup = () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    };

    const syncState = async (onReceive: (event: string, payload: any) => void) => {
        const { data, error } = await supabase.from('classroom_state').select('*').eq('id', 'current_state').single();
        if (data && data.current_question_id && !error) {
            onReceive('SYNC_STATE', {
                id: data.current_question_id,
                timerEndTime: data.timer_end_time
            });
        }
    };

    const sendPush = async (q: any, endTime: number | null, password: string) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/teacher-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'PUSH_QUESTION', payload: { questionId: q.id, timerEndTime: endTime } })
        });
    };

    const sendAddTime = async (newEndTime: number, password: string) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/teacher-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'ADD_TIME', payload: { newEndTime } })
        });
    };

    const leaveRoom = () => {
        if (channel) {
            console.log('🔌 [Sync] 離開房間，清理 WebSocket');
            if ((channel as any)._cleanup) (channel as any)._cleanup();
            supabase.removeChannel(channel);
            channel = null;
        }
    };

    return { joinRoom, sendPush, sendAddTime, leaveRoom };
}