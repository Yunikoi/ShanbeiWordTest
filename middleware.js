/** Vercel Edge：同源代理 Supabase（比 api/ 路由更稳，避免 NOT_FOUND） */
export const config = {
  matcher: '/api/supabase/:path*',
}

/** @param {Request} request */
export default async function middleware(request) {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  if (!base) {
    return Response.json({ message: 'Server missing VITE_SUPABASE_URL' }, { status: 503 })
  }

  const url = new URL(request.url)
  const rest = url.pathname.replace(/^\/api\/supabase\/?/, '')
  const target = `${base.replace(/\/$/, '')}/${rest}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('connection')

  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  })
}
