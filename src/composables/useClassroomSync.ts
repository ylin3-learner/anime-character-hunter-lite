import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

let channel: RealtimeChannel | null = null;

export function useClassroomSync() {
  // 初始化並加入房間
  const joinRoom = (onReceive: (event: string, payload: any) => void) => {
    if (channel) return; // 避免重複訂閱

    channel = supabase.channel('classroom_sync_room', {
      config: {
        broadcast: { ack: false, self: true }, // self: true 讓本地端也能收到自己發的訊息
      },
    });

    channel
      .on('broadcast', { event: 'TEACHER_PUSH' }, (payload) => {
        console.log('📡 [Sync] 收到老師發送的指令:', payload);
        onReceive('TEACHER_PUSH', payload.payload);
      })
      .on('broadcast', { event: 'TEACHER_ADD_TIME' }, (payload) => {
        console.log('📡 [Sync] 收到老師加時指令:', payload);
        onReceive('TEACHER_ADD_TIME', payload.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Sync] 已連線到課堂即時同步通道');
        }
      });
  };

  // 老師端發送指令
  const sendPush = (q: any) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'TEACHER_PUSH',
        payload: q,
      });
    }
  };

  const sendAddTime = (seconds: number) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'TEACHER_ADD_TIME',
        payload: { seconds },
      });
    }
  };

  const leaveRoom = () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  return { joinRoom, sendPush, sendAddTime, leaveRoom };
}