/** 同源代理 Supabase REST，避免浏览器直连 supabase.co 被拦（国内/手机常见 Failed to fetch） */
export const config = {
  api: { bodyParser: false },
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** @param {import('http').IncomingMessage} req */
export default async function handler(req, res) {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  if (!base) {
    res.status(503).json({ message: 'Server missing VITE_SUPABASE_URL' })
    return
  }

  const pathParts = req.query.path
  const pathSegment = Array.isArray(pathParts) ? pathParts.join('/') : pathParts || ''
  const incoming = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const target = `${base.replace(/\/$/, '')}/${pathSegment}${incoming.search}`

  /** @type {Record<string, string>} */
  const forwardHeaders = {}
  const skip = new Set(['host', 'connection', 'content-length', 'transfer-encoding'])
  for (const [key, val] of Object.entries(req.headers)) {
    if (skip.has(key.toLowerCase()) || val == null) continue
    forwardHeaders[key] = Array.isArray(val) ? val.join(', ') : String(val)
  }

  /** @type {RequestInit} */
  const init = { method: req.method, headers: forwardHeaders }
  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    const body = await readBody(req)
    if (body.length) init.body = body
  }

  try {
    const upstream = await fetch(target, init)
    res.status(upstream.status)
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return
      res.setHeader(key, value)
    })
    res.send(Buffer.from(await upstream.arrayBuffer()))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    res.status(502).json({ message: `Supabase proxy failed: ${msg}` })
  }
}
