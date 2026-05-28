import { polishExampleZh } from './ieltsSentence.js'

/**
 * 可选：用用户自备 API Key 调用大模型，为每个义项生成阅读向英文例句 + 中文译文。
 * - Gemini：浏览器直连 generativelanguage.googleapis.com（需在 Google AI Studio 创建密钥，并可限制 HTTP 来源）。
 * - Groq：开发时走 Vite 代理 /api/groq 避免 CORS；生产静态部署若无代理则可能失败。
 */

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseJsonLoose(text) {
  let t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im
  const m = t.match(fence)
  if (m) t = m[1].trim()
  return JSON.parse(t)
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[] }} entry
 */
function buildUserPrompt(entry) {
  const lines = entry.senses.map(
    (s, i) => `${i + 1}. partOfSpeech: ${s.pos ?? '(none)'}  Chinese gloss (do not paste into English): ${s.zh}`,
  )
  return `You write short passages in the style of Cambridge IELTS Academic Reading (B2–C1).

Headword (must appear EXACTLY as written, including spaces/punctuation): ${JSON.stringify(entry.word)}

Senses in order:
${lines.join('\n')}

For EACH sense, output ONE English sentence (22–48 words) that naturally uses the headword and reflects that sense. Do NOT put Chinese characters inside the English sentence.

Also output exampleZh: one faithful, natural Chinese sentence that translates ONLY that English sentence (no commentary).
exampleZh must be entirely in Chinese: do NOT leave the English headword in the Chinese sentence; use the Chinese gloss for that sense instead.

Return JSON ONLY with this shape:
{"senses":[{"example":"...","exampleZh":"..."}]}
The array length MUST equal ${entry.senses.length} and preserve sense order.`
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string, example?: string, exampleZh?: string }[], ipa?: string, relations?: import('./wordRelations.js').WordRelations, rootAnalysis?: import('./rootAnalysis.js').RootAnalysis }} entry
 * @param {unknown} parsed
 */
function mergeParsed(entry, parsed) {
  const arr = parsed?.senses
  if (!Array.isArray(arr) || arr.length !== entry.senses.length) {
    throw new Error('模型返回的 JSON 义项数量与请求不一致')
  }
  return {
    word: entry.word,
    ...(entry.ipa ? { ipa: entry.ipa } : {}),
    ...(entry.relations ? { relations: entry.relations } : {}),
    ...(entry.rootAnalysis ? { rootAnalysis: entry.rootAnalysis } : {}),
    senses: entry.senses.map((s, i) => {
      const p = arr[i]
      const ex = typeof p?.example === 'string' ? p.example.trim() : ''
      const zh = typeof p?.exampleZh === 'string' ? p.exampleZh.trim() : ''
      if (!ex || !zh) throw new Error('模型返回的 example / exampleZh 不完整')
      return { ...s, example: ex, exampleZh: polishExampleZh(entry.word, s.zh, zh) }
    }),
  }
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {string} userText
 */
async function geminiGenerateJson(apiKey, model, userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const raw = await r.text()
  if (!r.ok) throw new Error(raw.slice(0, 400) || `Gemini HTTP ${r.status}`)
  const data = JSON.parse(raw)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 未返回文本')
  return parseJsonLoose(text)
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {string} userText
 */
/**
 * @param {import('./llmSettings.js').LlmSettings} cfg
 * @param {string} userText
 * @param {string} [systemText]
 */
export async function generateLlmJson(cfg, userText, systemText) {
  if (cfg.provider === 'groq') {
    return groqGenerateJson(cfg.apiKey, cfg.modelGroq, userText, systemText)
  }
  return geminiGenerateJson(cfg.apiKey, cfg.modelGemini, userText)
}

/**
 * @param {string} apiKey
 * @param {string} model
 * @param {string} userText
 * @param {string} [systemText]
 */
async function groqGenerateJson(apiKey, model, userText, systemText) {
  const base = import.meta.env.DEV ? '/api/groq' : 'https://api.groq.com/openai/v1'
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
          content:
            systemText ||
            'You reply with valid JSON only. The user asks for a JSON object with a "senses" array.',
        },
        { role: 'user', content: userText },
      ],
      temperature: 0.65,
      response_format: { type: 'json_object' },
    }),
  })
  const raw = await r.text()
  if (!r.ok) throw new Error(raw.slice(0, 400) || `Groq HTTP ${r.status}`)
  const data = JSON.parse(raw)
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Groq 未返回文本')
  return parseJsonLoose(text)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[] }} entry
 * @param {import('./llmSettings.js').LlmSettings} cfg
 */
export async function generateEntryExamples(entry, cfg) {
  const prompt = buildUserPrompt(entry)
  let parsed
  if (cfg.provider === 'groq') {
    parsed = await groqGenerateJson(cfg.apiKey, cfg.modelGroq, prompt)
  } else {
    parsed = await geminiGenerateJson(cfg.apiKey, cfg.modelGemini, prompt)
  }
  return mergeParsed(entry, parsed)
}

/**
 * 顺序请求，减轻免费层限流；单条失败则保留原 entry。
 * @param {{ word: string, senses: unknown[] }[]} queue
 * @param {import('./llmSettings.js').LlmSettings} cfg
 * @param {{ onProgress?: (done: number, total: number) => void }} [opts]
 */
export async function enrichQueueWithLLM(queue, cfg, opts = {}) {
  const { onProgress } = opts
  const out = []
  let done = 0
  for (const entry of queue) {
    try {
      out.push(await generateEntryExamples(entry, cfg))
    } catch {
      out.push(entry)
    }
    done += 1
    onProgress?.(done, queue.length)
    await sleep(350)
  }
  return out
}
