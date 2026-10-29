import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;

export function useClassroomSync() {
    const joinRoom = (onReceive: (event: string, payload: any) => void, studentId: string = 'anonymous') => {
        if (channel) {
            supabase.removeChannel(channel);
            channel = null;
        }

        const channelName = `classroom_sync_${Date.now()}`;

        channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: studentId,
                },
            },
        })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classroom_state' }, (payload) => {
                const newState = payload.new;
                onReceive('SYNC_STATE', {
                    id: newState.current_question_id,
                    timerEndTime: newState.timer_end_time,
                    isClassMode: newState.is_class_mode,
                    targetCount: newState.target_count
                });
            })
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel?.presenceState() || {};
                const completedCount = Object.values(presenceState)
                    .flat()
                    .filter((p: any) => p.status === 'completed').length;
                onReceive('PRESENCE_SYNC', { completedCount });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel?.track({ status: 'answering' });
                    // 連線成功時主動拉取一次最新狀態
                    const { data } = await supabase.from('classroom_state').select('*').eq('id', 'current_state').single();
                    if (data) {
                        onReceive('SYNC_STATE', {
                            id: data.current_question_id,
                            timerEndTime: data.timer_end_time,
                            isClassMode: data.is_class_mode,
                            targetCount: data.target_count
                        });
                    }
                }
            });
    };

    const trackCompleted = async () => {
        if (channel) {
            await channel.track({ status: 'completed' });
        }
    };

    const trackAnswering = async () => {
        if (channel) {
            await channel.track({ status: 'answering' });
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

    const updateClassMode = async (isClassMode: boolean, targetCount: number, password: string) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/teacher-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                action: 'UPDATE_SETTINGS',
                payload: { isClassMode, targetCount }
            })
        });
    };

    const leaveRoom = () => {
        if (channel) { supabase.removeChannel(channel); channel = null; }
    };

    return { joinRoom, trackCompleted, trackAnswering, sendPush, sendAddTime, updateClassMode, leaveRoom };
}