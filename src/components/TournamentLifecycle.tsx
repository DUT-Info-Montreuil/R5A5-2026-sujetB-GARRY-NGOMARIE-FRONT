import { useI18n } from '@/i18n/I18nContext'
import type { TournamentStatus } from '@/lib/api/types'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TournamentLifecycleProps {
  status: TournamentStatus
}

export function TournamentLifecycle({ status }: TournamentLifecycleProps) {
  const { t } = useI18n()

  const steps: { key: TournamentStatus; label: string }[] = [
    { key: 'registration_open', label: t('lifecycle.registration_open') },
    { key: 'registration_closed', label: t('lifecycle.registration_closed') },
    { key: 'running', label: t('lifecycle.running') },
    { key: 'finished', label: t('lifecycle.finished') },
  ]

  const statusOrder: Record<TournamentStatus, number> = {
    registration_open: 0,
    registration_closed: 1,
    running: 2,
    finished: 3,
  }

  const currentIndex = statusOrder[status] ?? 0

  return (
    <div
      className="w-full py-2"
      aria-label={t('lifecycle.label')}
      role="region"
    >
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex

          return (
            <li
              key={step.key}
              className="flex flex-1 flex-col items-center gap-1.5 text-center"
            >
              <div className="flex w-full items-center">
                {/* Connector line left */}
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors',
                    idx === 0
                      ? 'invisible'
                      : idx <= currentIndex
                        ? 'bg-primary'
                        : 'bg-muted'
                  )}
                />
                {/* Step node */}
                <div
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'border-2 border-primary bg-background text-primary ring-2 ring-primary/20 ring-offset-1'
                        : 'border border-muted-foreground/30 bg-muted/40 text-muted-foreground'
                  )}
                >
                  {isDone ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                {/* Connector line right */}
                <div
                  className={cn(
                    'h-0.5 flex-1 transition-colors',
                    idx === steps.length - 1
                      ? 'invisible'
                      : idx < currentIndex
                        ? 'bg-primary'
                        : 'bg-muted'
                  )}
                />
              </div>

              <span
                className={cn(
                  'text-[0.7rem] sm:text-xs font-medium leading-tight',
                  isCurrent
                    ? 'font-bold text-foreground'
                    : isDone
                      ? 'text-foreground/80'
                      : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
