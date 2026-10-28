import * as React from 'react'
import { useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { teamsApi, chatApi } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/api/queryKeys'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { useTeamChat } from '@/hooks/useTeamChat'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  MessageCircleIcon,
  SendIcon,
  ChevronLeftIcon,
  ShieldAlertIcon,
  WifiOffIcon,
} from 'lucide-react'
import { toast } from 'sonner'

export function ChatPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const { user, isAdmin } = useAuth()

  const [input, setInput] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Team detail query
  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: queryKeys.team(id),
    queryFn: () => teamsApi.get(id),
    enabled: !!id,
  })

  // Initial messages query (fallback / seed)
  const { data: initialMessages = [] } = useQuery({
    queryKey: queryKeys.messages(id),
    queryFn: () => chatApi.history(id),
    enabled: !!id,
  })

  // WebSocket + REST chat hook
  const { messages, status, isSending, error, sendMessage } = useTeamChat({
    teamId: id,
    initialMessages,
    enabled: !!id,
    onRevoked: (reason) => {
      const msg = (t as any)(`chat.revoked.${reason}`) || t('chat.revoked.default')
      toast.error(msg)
    },
  })

  const isMember = user && team && team.members.some((m) => m.user_id === user.id)
  const isEliminated = team?.is_eliminated

  // Scroll to bottom on message
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isSending) return

    const content = input
    setInput('')
    try {
      await sendMessage(content)
    } catch {
      setInput(content)
      toast.error(t('chat.sendFailed'))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessageTime = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoString))
    } catch {
      return ''
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] pb-nav md:pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b bg-card/60 px-3 py-2.5 backdrop-blur-md rounded-t-xl">
        <div className="flex items-center gap-2">
          <Link
            to={`/teams/${id}`}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t('common.back')}
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              {team?.name || t('chat.title')}
            </h1>
            <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
              <span
                className={`size-1.5 rounded-full ${
                  status === 'open'
                    ? 'bg-emerald-500'
                    : status === 'connecting' || status === 'reconnecting'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-zinc-400'
                }`}
              />
              <span>{t(`chat.status.${status}` as any)}</span>
            </div>
          </div>
        </div>

        {isAdmin && !isMember && (
          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-amber-600 dark:text-amber-400">
            {t('chat.adminReadOnly')}
          </span>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <Empty className="h-full border-0 p-8 flex items-center justify-center">
            <EmptyHeader>
              <MessageCircleIcon className="size-8 text-muted-foreground" />
              <EmptyTitle>{t('chat.empty')}</EmptyTitle>
              <EmptyDescription>{t('chat.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          messages.map((msg) => {
            const isMe = user?.id === msg.author_id

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-baseline gap-1.5 text-[0.7rem] text-muted-foreground px-1 mb-0.5">
                  <span className="font-semibold text-foreground/80">
                    {msg.author_username || t('chat.formerMember')}
                  </span>
                  <span>{formatMessageTime(msg.created_at)}</span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-muted text-foreground rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input or Banner */}
      <div className="border-t bg-card/60 p-3 rounded-b-xl">
        {isEliminated ? (
          <p className="text-center text-xs text-muted-foreground italic py-2">
            {t('chat.eliminated')}
          </p>
        ) : isAdmin && !isMember ? (
          <p className="text-center text-xs text-muted-foreground italic py-2">
            {t('chat.adminReadOnly')}
          </p>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              maxLength={2000}
              className="min-h-10 max-h-28 resize-none py-2 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSending}
              className="size-10 shrink-0"
              aria-label={t('chat.send')}
            >
              <SendIcon className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
