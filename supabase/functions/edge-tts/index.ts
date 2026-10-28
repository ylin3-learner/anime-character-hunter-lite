import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 接收前端傳來的音檔 (FormData)
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) throw new Error("Missing audio file")

    // 呼叫 Deepgram API
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&language=en-US", {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/webm', // 根據你的錄音格式調整
      },
      body: await audioFile.arrayBuffer(),
    })

    const data = await response.json()
    const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || ''

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})