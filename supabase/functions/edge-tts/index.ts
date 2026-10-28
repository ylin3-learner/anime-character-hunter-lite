import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import md5 from "https://esm.sh/blueimp-md5@2.19.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 👈 接收 voice 參數，預設為 Aria
    const { text, rate = "0.8", voice = "en-US-AriaNeural" } = await req.json()
    if (!text) throw new Error("Missing text")

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 👈 關鍵：把 voice 加進 MD5，這樣不同聲音才會有不同的快取檔案
    const fileName = `${md5(text + voice + rate)}.mp3`

    // 檢查快取
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('tts-audio')
      .list('', { search: fileName })

    if (fileData && fileData.length > 0) {
      const { data: { publicUrl } } = supabaseClient.storage.from('tts-audio').getPublicUrl(fileName)
      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 呼叫微軟 Edge TTS API
    const edgeUrl = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`
    
    // 👈 使用傳入的 voice 參數
    const payload = `X-Timestamp:${Date.now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\nX-RequestId:${crypto.randomUUID()}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='${rate}'>${text}</prosody></voice></speak>`

    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: payload
    })

    if (!response.ok) throw new Error("Edge TTS API failed")

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    let start = 0
    for (let i = 0; i < uint8Array.length - 4; i++) {
      if (uint8Array[i] === 0xFF && (uint8Array[i+1] & 0xF0) === 0xF0) {
        start = i
        break
      }
    }
    const audioBuffer = uint8Array.slice(start)

    const { error: uploadError } = await supabaseClient.storage
      .from('tts-audio')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseClient.storage.from('tts-audio').getPublicUrl(fileName)

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})