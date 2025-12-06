import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { parseSessionCookie } from '@/lib/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar se o token está configurado
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('[Subscription] MERCADOPAGO_ACCESS_TOKEN não configurado')
      return NextResponse.json(
        { error: 'Pagamento não configurado. Entre em contato com o suporte.' }, 
        { status: 503 }
      )
    }

    // Verificar sessão do usuário
    const cookieHeader = request.headers.get('cookie')
    const session = await parseSessionCookie(cookieHeader)
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId || userId !== session.userId) {
      return NextResponse.json({ error: 'User ID inválido' }, { status: 400 })
    }

    // Buscar perfil do usuário no banco
    const supabase = getSupabaseAdmin()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, subscription_status, subscription_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[Subscription] Perfil não encontrado:', profileError)
      return NextResponse.json(
        { error: 'Perfil não encontrado' }, 
        { status: 404 }
      )
    }

    if (!profile.email) {
      return NextResponse.json(
        { error: 'Email não cadastrado. Por favor, vincule uma conta com email.' }, 
        { status: 400 }
      )
    }

    // Verificar se já tem assinatura ativa
    if (profile.subscription_status === 'active') {
      console.log('[Subscription] Usuário já possui assinatura ativa:', profile.subscription_id)
      return NextResponse.json(
        { 
          error: 'Você já possui uma assinatura ativa do Clube WaveIGL',
          subscription_id: profile.subscription_id,
          already_subscribed: true
        }, 
        { status: 409 } // Conflict
      )
    }

    // Criar cliente do Mercado Pago
    const client = new MercadoPagoConfig({ accessToken })

    // Se tem subscription_id mas status não está ativo, verificar no Mercado Pago
    if (profile.subscription_id) {
      try {
        const preapproval = new PreApproval(client)
        const existingPreapproval = await preapproval.get({ id: profile.subscription_id })
        const status = (existingPreapproval as any)?.status
        
        // Status possíveis: authorized, pending, paused, cancelled
        if (status === 'authorized' || status === 'pending') {
          console.log('[Subscription] Assinatura existente ainda está ativa no MP:', status)
          return NextResponse.json(
            { 
              error: 'Você já possui uma assinatura pendente ou ativa. Verifique seu email ou entre em contato com o suporte.',
              subscription_id: profile.subscription_id,
              already_subscribed: true
            }, 
            { status: 409 }
          )
        }
      } catch (mpError: any) {
        // Se não encontrou no MP (404), pode continuar criando nova
        // Outros erros são logados mas não bloqueiam
        if (mpError?.status !== 404) {
          console.error('[Subscription] Erro ao verificar assinatura existente:', mpError?.message)
        }
      }
    }

    // Determinar URLs (MP não aceita localhost)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waveigl.com'
    const backUrl = appUrl.includes('localhost') 
      ? 'https://waveigl.com/dashboard?subscription=success' 
      : `${appUrl}/dashboard?subscription=success`
    const webhookUrl = appUrl.includes('localhost')
      ? undefined // Webhook não funciona em localhost mesmo
      : `${appUrl}/api/subscription/webhook`

    // Preapproval é o fluxo recomendado para recorrência
    const preapprovalBody: any = {
      reason: 'Clube WaveIGL - Assinatura Mensal',
      external_reference: userId,
      payer_email: profile.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 9.9,
        currency_id: 'BRL',
      },
      back_url: backUrl,
    }

    // Só adiciona webhook se não for localhost
    if (webhookUrl) {
      preapprovalBody.notification_url = webhookUrl
    }

    const preapproval = await new PreApproval(client).create({
      body: preapprovalBody,
    })

    console.log('[Subscription] Preapproval criado:', (preapproval as any)?.id)

    return NextResponse.json({ 
      init_point: (preapproval as any)?.init_point || (preapproval as any)?.sandbox_init_point || null,
      preapproval_id: (preapproval as any)?.id || null,
    })

  } catch (error: any) {
    const errorMessage = error?.message || error?.cause?.message || String(error)
    console.error('[Subscription] Erro ao criar preferência:', errorMessage)
    
    // Erro de verificação de dados do vendedor
    if (errorMessage.includes('personal data verification')) {
      return NextResponse.json(
        { error: 'Sistema de pagamento em configuração. Tente novamente em breve.' }, 
        { status: 503 }
      )
    }
    
    // Erro de autenticação do Mercado Pago
    if (errorMessage.includes('Unauthorized') || error?.status === 401) {
      return NextResponse.json(
        { error: 'Token do Mercado Pago inválido. Verifique as configurações.' }, 
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Falha ao processar pagamento. Tente novamente.' }, 
      { status: 500 }
    )
  }
}
