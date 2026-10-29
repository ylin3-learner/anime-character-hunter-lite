import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;

export function useClassroomSync() {
    const joinRoom = (onReceive: (event: string, payload: any) => void) => {
        if (channel) return;

        channel = supabase.channel('classroom_db_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'classroom_state' },
                (payload) => {
                    console.log('📡 [Sync] 偵測到資料庫狀態更新:', payload.new);
                    const newState = payload.new;
                    const oldState = payload.old;

                    // 如果題目 ID 變了，觸發跳題
                    if (newState.current_question_id !== oldState.current_question_id) {
                        onReceive('TEACHER_PUSH', {
                            id: newState.current_question_id,
                            timerEndTime: newState.timer_end_time
                        });
                    }
                    // 如果題目沒變，但結束時間變了，觸發加時
                    else if (newState.timer_end_time !== oldState.timer_end_time) {
                        onReceive('TEACHER_ADD_TIME', {
                            newEndTime: newState.timer_end_time
                        });
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [Sync] 已連線至資料庫變更監聽');
                    syncState(onReceive);
                }
            });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) syncState(onReceive);
        });
    };

    const syncState = async (onReceive: (event: string, payload: any) => void) => {
        const { data, error } = await supabase.from('classroom_state').select('*').eq('id', 'current_state').single();
        if (data && data.current_question_id && !error) {
            onReceive('TEACHER_PUSH', {
                id: data.current_question_id,
                timerEndTime: data.timer_end_time
            });
        }
    };

    // ... sendPush 與 sendAddTime 保持不變 ...
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
        if (channel) { supabase.removeChannel(channel); channel = null; }
    };

    return { joinRoom, sendPush, sendAddTime, leaveRoom };
}