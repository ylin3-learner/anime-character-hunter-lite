import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;

export function useClassroomSync() {
    const joinRoom = (onReceive: (event: string, payload: any) => void) => {
        if (channel) return;

        // 👈 改用 postgres_changes 監聽資料庫變更
        channel = supabase.channel('classroom_db_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'classroom_state' },
                (payload) => {
                    console.log('📡 [Sync] 偵測到資料庫狀態更新:', payload.new);
                    const newState = payload.new;
                    if (newState.current_question_id) {
                        onReceive('TEACHER_PUSH', {
                            id: newState.current_question_id,
                            timerEndTime: newState.timer_end_time
                        });
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [Sync] 已連線至資料庫變更監聽');
                    syncState(onReceive); // 連線成功時主動拉取一次
                }
            });

        // 切回分頁時主動拉取
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) syncState(onReceive);
        });
    };

    // 👈 主動向資料庫拉取最新狀態（解決斷線/休眠問題）
    const syncState = async (onReceive: (event: string, payload: any) => void) => {
        const { data } = await supabase.from('classroom_state').select('*').eq('id', 'current_state').single();
        if (data && data.current_question_id) {
            onReceive('TEACHER_PUSH', {
                id: data.current_question_id,
                timerEndTime: data.timer_end_time
            });
        }
    };

    // 👈 老師端：呼叫 Edge Function 發送指令
    const sendPush = async (q: any, endTime: number | null, password: string) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/teacher-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                action: 'PUSH_QUESTION',
                payload: { questionId: q.id, timerEndTime: endTime }
            })
        });
    };

    const sendAddTime = async (newEndTime: number, password: string) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/teacher-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                action: 'ADD_TIME',
                payload: { newEndTime }
            })
        });
    };

    const leaveRoom = () => {
        if (channel) {
            supabase.removeChannel(channel);
            channel = null;
        }
    };

    return { joinRoom, sendPush, sendAddTime, leaveRoom };
}