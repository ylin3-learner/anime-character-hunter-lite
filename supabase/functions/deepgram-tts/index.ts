import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { text, voice = 'aura-2-thalia-en', speed = 1.0 } = await req.json()
    if (!text) throw new Error("Missing text")

    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
    if (!deepgramApiKey) throw new Error("DEEPGRAM_API_KEY not configured")

    // 构建 Deepgram TTS 请求 URL
    const url = new URL('https://api.deepgram.com/v1/speak')
    url.searchParams.set('model', voice)
    url.searchParams.set('speed', speed.toString())

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Deepgram TTS] API error: ${response.status}`, errorText)
      throw new Error(`Deepgram TTS API failed with status ${response.status}`)
    }

    // 直接将音频二进制流返回给前端
    const audioBuffer = await response.arrayBuffer()
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Deepgram TTS] Error:`, errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})