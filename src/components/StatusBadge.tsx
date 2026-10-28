import { useI18n } from '@/i18n/I18nContext'
import { Badge } from '@/components/ui/badge'
import type { TournamentStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: TournamentStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useI18n()

  const config: Record<
    TournamentStatus,
    { label: string; dotClass: string; badgeVariant: 'default' | 'secondary' | 'outline' }
  > = {
    registration_open: {
      label: t('status.registration_open'),
      dotClass: 'bg-emerald-500 animate-pulse',
      badgeVariant: 'secondary',
    },
    registration_closed: {
      label: t('status.registration_closed'),
      dotClass: 'bg-amber-500',
      badgeVariant: 'outline',
    },
    running: {
      label: t('status.running'),
      dotClass: 'bg-rose-500 animate-ping',
      badgeVariant: 'default',
    },
    finished: {
      label: t('status.finished'),
      dotClass: 'bg-zinc-400',
      badgeVariant: 'outline',
    },
  }

  const current = config[status] || {
    label: status,
    dotClass: 'bg-zinc-400',
    badgeVariant: 'outline' as const,
  }

  return (
    <Badge
      variant={current.badgeVariant}
      className={cn('inline-flex items-center gap-1.5 font-medium text-xs', className)}
    >
      <span className={cn('size-1.5 rounded-full', current.dotClass)} />
      <span>{current.label}</span>
    </Badge>
  )
}
