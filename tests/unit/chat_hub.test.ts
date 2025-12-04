import { describe, it, expect } from 'vitest'
import { chatHub } from '@/lib/chat/hub'

describe('chatHub', () => {
  it('publica eventos para assinantes', () => {
    const received: any[] = []
    const unsub = chatHub.subscribe((e) => received.push(e))
    
    // Usar estrutura correta do ChatMessage
    const testMessage = {
      id: 'test-123',
      platform: 'twitch' as const,
      username: 'testuser',
      userId: 'user-123',
      message: 'Hello world test message',
      timestamp: Date.now(),
      badges: []
    }
    
    chatHub.publish(testMessage)
    unsub()
    
    expect(received).toHaveLength(1)
    expect(received[0].username).toBe('testuser')
    expect(received[0].message).toBe('Hello world test message')
  })
})


