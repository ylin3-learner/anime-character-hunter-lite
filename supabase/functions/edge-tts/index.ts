import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// 👈 修正 1：改用 npm: 協議引入，解決 no-import-prefix 與 default export 錯誤
import md5 from "npm:blueimp-md5@2.19.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { text, rate = "1.0", voice = "en-US-AriaNeural" } = await req.json()
    if (!text) throw new Error("Missing text")

    const numericRate = parseFloat(rate);
    const prosodyRate = numericRate === 1.0 ? "+0%" : `${Math.round((numericRate - 1) * 100)}%`;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `${md5(text + voice + prosodyRate)}.mp3`

    // 👈 修正 2：移除未使用的 fileError
    const { data: fileData } = await supabaseClient.storage
      .from('tts-audio')
      .list('', { search: fileName })

    if (fileData && fileData.length > 0) {
      const { data: { publicUrl } } = supabaseClient.storage.from('tts-audio').getPublicUrl(fileName)
      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const edgeUrl = `https://api.msedgeservices.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`

    const payload = `X-Timestamp:${Date.now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\nX-RequestId:${crypto.randomUUID()}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='${prosodyRate}'>${text}</prosody></voice></speak>`

    console.log(`[Edge Function] 正在請求微軟 API...`)
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: payload
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Edge Function] 微軟 API 回應失敗: ${response.status}`, errorText);
      throw new Error(`Edge TTS API failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    let start = 0
    for (let i = 0; i < uint8Array.length - 4; i++) {
      if (uint8Array[i] === 0xFF && (uint8Array[i + 1] & 0xF0) === 0xF0) {
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

    // 👈 修正 3：移除 any 型別，改用安全的方式取得 error message
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Edge Function] 執行出錯:`, errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})