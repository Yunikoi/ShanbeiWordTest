/**
 * OpenAI 兼容 Chat Completions（Groq / DeepSeek）。
 * @param {string} text
 */
export function parseJsonLoose(text) {
  let t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im
  const m = t.match(fence)
  if (m) t = m[1].trim()
  return JSON.parse(t)
}

/**
 * @param {string} devProxy
 * @param {string} prodBase
 * @param {string} apiKey
 * @param {string} model
 * @param {string} userText
 * @param {string} [systemText]
 */
export async function openaiChatJson(devProxy, prodBase, apiKey, model, userText, systemText) {
  const base = import.meta.env.DEV ? devProxy : prodBase
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: systemText || 'Reply with valid JSON only.',
        },
        { role: 'user', content: userText },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })
  const raw = await r.text()
  if (!r.ok) throw new Error(raw.slice(0, 400) || `HTTP ${r.status}`)
  const data = JSON.parse(raw)
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('模型未返回文本')
  return parseJsonLoose(text)
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {string} userText
 * @param {string} systemText
 */
export function openaiChatJsonForRoot(apiKey, model, userText, systemText) {
  return openaiChatJson('/api/deepseek', 'https://api.deepseek.com', apiKey, model, userText, systemText)
}
