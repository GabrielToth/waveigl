import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('Moderation timeout route', () => {
  it('400 quando faltam parâmetros', async () => {
    const { POST } = await import('@/app/api/moderation/timeout/route')
    const req = new NextRequest('http://localhost:3000/api/moderation/timeout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    } as any)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('403 ao tentar punir usuário protegido', async () => {
    vi.resetModules()
    vi.doMock('@/lib/supabase/server', () => {
      const moderatorId = 'mod1'
      const targetUserId = 'target-user-1'
      const targetPlatformUserId = '173162545' // ID do owner (waveigl)
      
      return {
        getSupabaseAdmin: () => ({
          from: (table: string) => {
            return {
              select: () => ({
                eq: (col: string, val: string) => {
                  // Mock para buscar contas do moderador
                  if (table === 'linked_accounts' && col === 'user_id' && val === moderatorId) {
                    return {
                      data: [
                        { platform: 'twitch', platform_username: 'moduser', platform_user_id: '999', user_id: moderatorId, is_moderator: true }
                      ],
                      error: null
                    }
                  }
                  // Mock para buscar conta do alvo (por platform_user_id) - retorna owner
                  if (table === 'linked_accounts' && col === 'platform') {
                    return {
                      eq: (col2: string, val2: string) => {
                        if (col2 === 'platform_user_id' && val2 === targetPlatformUserId) {
                          return {
                            maybeSingle: () => Promise.resolve({
                              data: { platform: 'twitch', platform_username: 'waveigl', platform_user_id: targetPlatformUserId, user_id: targetUserId },
                              error: null
                            })
                          }
                        }
                        return { maybeSingle: () => Promise.resolve({ data: null, error: null }) }
                      }
                    }
                  }
                  // Mock para buscar todas as contas do alvo (verificar proteção)
                  if (table === 'linked_accounts' && col === 'user_id' && val === targetUserId) {
                    return {
                      data: [
                        { platform: 'twitch', platform_username: 'waveigl', platform_user_id: targetPlatformUserId, user_id: targetUserId }
                      ],
                      error: null
                    }
                  }
                  return { data: [], error: null }
                }
              }),
              insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'act1' }, error: null }) }) }),
              update: () => ({ eq: async () => ({}) })
            }
          }
        })
      }
    })
    const { POST } = await import('@/app/api/moderation/timeout/route')
    const req = new NextRequest('http://localhost:3000/api/moderation/timeout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        targetPlatformUserId: '173162545', // ID do owner (protegido)
        targetPlatform: 'twitch',
        durationSeconds: 60, 
        moderatorId: 'mod1' 
      })
    } as any)
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})


