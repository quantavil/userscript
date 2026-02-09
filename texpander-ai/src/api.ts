import type { GMRequestOptions } from './types'
import { CONFIG, state, GMX } from './config'

// ─────────────────────────────────────────────────────────────
// Gemini API
// ─────────────────────────────────────────────────────────────

function cleanAIResponse(s: string): string {
  if (!s) return s
  let out = s.trim()

  // Remove markdown code blocks
  const codeBlockMatch = out.match(/^```\w*\n?([\s\S]*?)\n?```$/)
  if (codeBlockMatch) out = codeBlockMatch[1].trim()

  // Remove wrapping quotes
  if ((out.startsWith('"') && out.endsWith('"')) ||
      (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1)
  }

  return out
}

function getApiKeys(): string[] {
  return (state.apiKey || '')
    .split(';')
    .map(k => k.trim())
    .filter(Boolean)
}

function buildRequestOptions(key: string, prompt: string): GMRequestOptions {
  return {
    method: 'POST',
    url: `${CONFIG.gemini.endpoint}/${CONFIG.gemini.model}:generateContent?key=${encodeURIComponent(key)}`,
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: CONFIG.gemini.temperature },
    }),
  }
}

export async function callGemini(systemPrompt: string, userText: string): Promise<string | null> {
  const keys = getApiKeys()
  if (!keys.length) return null

  const truncated = userText.slice(0, CONFIG.gemini.maxInputChars)
  const prompt = `${systemPrompt}\n\nText:\n${truncated}`

  for (let i = 0; i < keys.length; i++) {
    const idx = (state.apiKeyIndex + i) % keys.length
    try {
      const res = await GMX.request(buildRequestOptions(keys[idx], prompt))

      if (res.status >= 200 && res.status < 300) {
        const json = JSON.parse(res.text)
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) {
          state.apiKeyIndex = idx
          return cleanAIResponse(text)
        }
      }
    } catch {
      continue
    }
  }
  return null
}

export async function verifyApiKey(key: string): Promise<boolean> {
  try {
    const res = await GMX.request({
      method: 'GET',
      url: `${CONFIG.gemini.endpoint}?key=${encodeURIComponent(key)}`,
      timeout: 5000
    })
    return res.status < 300
  } catch {
    return false
  }
}