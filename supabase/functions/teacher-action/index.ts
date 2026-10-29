import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { password, action, payload } = await req.json()

    // 1. 驗證老師密碼
    const teacherPassword = Deno.env.get('TEACHER_PASSWORD') || 'admin123'
    if (password !== teacherPassword) {
      throw new Error("密碼錯誤，無權限執行操作")
    }

    // 2. 使用 Service Role Key 寫入資料庫
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'PUSH_QUESTION') {
      const { questionId, timerEndTime } = payload
      await supabaseClient.from('classroom_state').update({
        current_question_id: questionId,
        timer_end_time: timerEndTime,
        updated_at: new Date().toISOString()
      }).eq('id', 'current_state')
    } 
    else if (action === 'ADD_TIME') {
      const { newEndTime } = payload
      await supabaseClient.from('classroom_state').update({
        timer_end_time: newEndTime,
        updated_at: new Date().toISOString()
      }).eq('id', 'current_state')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    // 修正：確保 error 是 Error 實例，才能安全地讀取 message
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})