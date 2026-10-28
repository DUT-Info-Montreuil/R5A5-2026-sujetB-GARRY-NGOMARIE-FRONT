import * as React from 'react'
import { wsUrl } from '@/config/env'
import { chatApi } from '@/lib/api/endpoints'
import type { Message } from '@/lib/api/types'

export type ChatStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

interface UseTeamChatOptions {
  teamId: string
  initialMessages?: Message[]
  enabled?: boolean
  onRevoked?: (reason: string) => void
}

export function useTeamChat({
  teamId,
  initialMessages = [],
  enabled = true,
  onRevoked,
}: UseTeamChatOptions) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [status, setStatus] = React.useState<ChatStatus>('closed')
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const socketRef = React.useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = React.useRef<any>(null)
  const attemptsRef = React.useRef(0)

  // Keep local messages updated if initialMessages changes and local list is empty
  React.useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id))
        const newOnes = initialMessages.filter((m) => !existingIds.has(m.id))
        if (newOnes.length === 0) return prev
        const combined = [...prev, ...newOnes]
        return combined.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
    }
  }, [initialMessages])

  const connect = React.useCallback(() => {
    if (!enabled || !teamId || typeof window === 'undefined') return

    try {
      const url = wsUrl(chatApi.wsPath(teamId))
      setStatus(attemptsRef.current === 0 ? 'connecting' : 'reconnecting')
      const ws = new WebSocket(url)
      socketRef.current = ws

      ws.onopen = () => {
        setStatus('open')
        attemptsRef.current = 0
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'message' && payload.data) {
            const incoming: Message = payload.data
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev
              return [...prev, incoming]
            })
          } else if (payload.type === 'system' && payload.event === 'revoked') {
            onRevoked?.(payload.reason || 'revoked')
          } else if (payload.type === 'error') {
            setError(payload.detail || 'WebSocket error')
          }
        } catch {
          // ignore unparsable
        }
      }

      ws.onclose = (event) => {
        setStatus('closed')
        socketRef.current = null

        // 4401: unauthorized, 4403: forbidden, 4404: not found -> do not reconnect
        if ([4401, 4403, 4404].includes(event.code)) {
          return
        }

        // Auto reconnect with exponential backoff if enabled
        if (enabled) {
          const delay = Math.min(1000 * Math.pow(1.5, attemptsRef.current), 10000)
          attemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }

      ws.onerror = () => {
        // ws.onclose will be called
      }
    } catch {
      setStatus('closed')
    }
  }, [enabled, teamId, onRevoked])

  React.useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [connect])

  const sendMessage = React.useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      setIsSending(true)
      setError(null)

      // Try sending via WebSocket if connected
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(
            JSON.stringify({
              type: 'message',
              content: trimmed,
            })
          )
          setIsSending(false)
          return
        } catch {
          // Fallback to REST
        }
      }

      // Fallback to REST
      try {
        const created = await chatApi.post(teamId, trimmed)
        setMessages((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev
          return [...prev, created]
        })
      } catch (err: any) {
        setError(err?.detail || err?.message || 'Erreur d’envoi')
        throw err
      } finally {
        setIsSending(false)
      }
    },
    [teamId]
  )

  return {
    messages,
    status,
    isSending,
    error,
    sendMessage,
    setMessages,
  }
}
