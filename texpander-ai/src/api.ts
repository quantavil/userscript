import { CONFIG, state, GMX } from './config'

function cleanResponse(s: string): string {
  let out = s.trim()
  const m = out.match(/^```\w*\n?([\s\S]*?)\n?```$/)
  if (m) out = m[1].trim()
  if ((out[0] === '"' && out.at(-1) === '"') || (out[0] === "'" && out.at(-1) === "'"))
    out = out.slice(1, -1)
  return out
}

export async function callGemini(systemPrompt: string, userText: string): Promise<string | null> {
  const keys = state.apiKey.split(';').map(k => k.trim()).filter(Boolean)
  if (!keys.length) return null

  const prompt = `${systemPrompt}\n\nText:\n${userText.slice(0, CONFIG.gemini.maxInputChars)}`
  const { endpoint, model, temperature } = CONFIG.gemini

  for (let i = 0; i < keys.length; i++) {
    const idx = (state.apiKeyIndex + i) % keys.length
    try {
      const res = await GMX.request({
        method: 'POST',
        url: `${endpoint}/${model}:generateContent?key=${encodeURIComponent(keys[idx])}`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature },
        }),
      })
      if (res.status >= 200 && res.status < 300) {
        const text = JSON.parse(res.text).candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) { state.apiKeyIndex = (idx + 1) % keys.length; return cleanResponse(text) }
      }
    } catch { continue }
  }
  return null
}

export async function verifyApiKey(key: string): Promise<boolean> {
  try {
    return (await GMX.request({
      method: 'GET',
      url: `${CONFIG.gemini.endpoint}?key=${encodeURIComponent(key)}`,
      timeout: 5000
    })).status < 300
  } catch { return false }
}