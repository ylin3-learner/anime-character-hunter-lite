// 👈 改為使用 deno.json 定義的模組名稱，消除 Lint 警告
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 👈 使用 Deno 內建的 serve
Deno.serve(async (req: Request) => {
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

    // 使用 Deno 內建的 crypto 產生 SHA-256 雜湊作為檔名
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256", 
      new TextEncoder().encode(text + voice + prosodyRate)
    )
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const fileName = `${hashHex}.mp3`

    // 檢查快取
    const { data: fileData, error: _fileError } = await supabaseClient.storage
      .from('tts-audio')
      .list('', { search: fileName })

    if (fileData && fileData.length > 0) {
      const { data: { publicUrl } } = supabaseClient.storage.from('tts-audio').getPublicUrl(fileName)
      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 微軟最新端點
    const edgeUrl = `https://api.msedgeservices.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`

    const payload = `X-Timestamp:${Date.now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\nX-RequestId:${crypto.randomUUID()}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='${prosodyRate}'>${text}</prosody></voice></speak>`

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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})