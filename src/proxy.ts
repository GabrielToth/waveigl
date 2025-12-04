import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { parseSessionCookie } from '@/lib/auth/session'

/**
 * Adiciona headers de segurança à resposta
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevenir clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy (desabilitar recursos não utilizados)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // HSTS - Força HTTPS (apenas em produção)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  // Content Security Policy básico
  // Permite recursos do próprio domínio + CDNs necessários
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://player.twitch.tv https://www.youtube.com https://kick.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "frame-src 'self' https://player.twitch.tv https://www.youtube.com https://kick.com https://embed.twitch.tv",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.twitch.tv https://id.twitch.tv https://www.googleapis.com https://kick.com https://discord.com",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token (se usarmos Supabase Auth futuramente)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Suporte a sessão custom via cookie assinado
  const session = await parseSessionCookie(request.headers.get('cookie'))
  const isLogged = Boolean(user) || Boolean(session)

  // Proteger rotas do dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard') && !isLogged) {
    return addSecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)))
  }

  // Redirecionar usuários autenticados da página de login
  if ((request.nextUrl.pathname.startsWith('/auth/login') || request.nextUrl.pathname === '/') && isLogged) {
    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  // Adicionar headers de segurança a todas as respostas
  return addSecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
