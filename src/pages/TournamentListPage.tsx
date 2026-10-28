import * as React from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { tournamentsApi } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/api/queryKeys'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { StatusBadge } from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  TrophyIcon,
  SearchIcon,
  PlusIcon,
  Gamepad2Icon,
  CalendarIcon,
  XIcon,
} from 'lucide-react'
import type { TournamentStatus } from '@/lib/api/types'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function TournamentListPage() {
  const { t, locale } = useI18n()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<TournamentStatus | 'all'>('all')

  // Create tournament dialog state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newGame, setNewGame] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const {
    data: tournaments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tournaments,
    queryFn: tournamentsApi.list,
  })

  const filteredTournaments = React.useMemo(() => {
    return tournaments.filter((tournament) => {
      const matchesSearch =
        search.trim() === '' ||
        tournament.name.toLowerCase().includes(search.toLowerCase()) ||
        tournament.game.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = statusFilter === 'all' || tournament.status === statusFilter
      return matchesSearch && matchesFilter
    })
  }, [tournaments, search, statusFilter])

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newGame.trim()) return

    setIsSubmitting(true)
    try {
      const created = await tournamentsApi.create(newName.trim(), newGame.trim())
      toast.success(t('tournaments.created', { name: created.name }))
      setIsCreateOpen(false)
      setNewName('')
      setNewGame('')
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
      }).format(new Date(isoString))
    } catch {
      return isoString
    }
  }

  return (
    <div className="space-y-6 pb-nav md:pb-12">
      {/* Top Banner / Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            {t('tournaments.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('tournaments.subtitle')}</p>
        </div>

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger
              render={
                <Button className="gap-1.5 self-start shadow-sm sm:self-auto">
                  <PlusIcon className="size-4" />
                  <span>{t('tournaments.create')}</span>
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateTournament}>
                <DialogHeader>
                  <DialogTitle>{t('tournaments.createTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('tournaments.createDescription')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <label htmlFor="t-name" className="text-sm font-medium">
                      {t('tournaments.name')}
                    </label>
                    <Input
                      id="t-name"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder={t('tournaments.namePlaceholder')}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('tournaments.nameLength')}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="t-game" className="text-sm font-medium">
                      {t('tournaments.game')}
                    </label>
                    <Input
                      id="t-game"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder={t('tournaments.gamePlaceholder')}
                      value={newGame}
                      onChange={(e) => setNewGame(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={isSubmitting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.loading') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tournaments.searchPlaceholder')}
            className="pl-9 pr-9"
            aria-label={t('tournaments.searchLabel')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('common.clearSearch')}
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              'all',
              'registration_open',
              'registration_closed',
              'running',
              'finished',
            ] as const
          ).map((filterKey) => {
            const isSelected = statusFilter === filterKey
            const label =
              filterKey === 'all'
                ? t('tournaments.filterAll')
                : t(`status.${filterKey}` as any)

            return (
              <Button
                key={filterKey}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => setStatusFilter(filterKey)}
              >
                {label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Tournaments List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">{t('errors.network')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            {t('common.retry')}
          </Button>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <Empty className="border border-dashed p-8">
          <EmptyHeader>
            <TrophyIcon className="size-8 text-muted-foreground" />
            <EmptyTitle>
              {search || statusFilter !== 'all'
                ? t('tournaments.emptyFiltered')
                : t('tournaments.empty')}
            </EmptyTitle>
            <EmptyDescription>
              {search || statusFilter !== 'all'
                ? t('tournaments.emptyFilteredDescription')
                : t('tournaments.emptyDescription')}
            </EmptyDescription>
          </EmptyHeader>
          {(search || statusFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="mt-4"
            >
              {t('tournaments.resetFilters')}
            </Button>
          )}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredTournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="group block focus-visible:outline-none"
            >
              <Card className="h-full transition-all duration-150 group-hover:border-primary/50 group-hover:shadow-sm group-focus-visible:border-ring group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardContent className="flex h-full flex-col justify-between p-4 sm:p-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-bold leading-snug tracking-tight text-foreground group-hover:text-primary">
                        {tournament.name}
                      </h2>
                      <StatusBadge status={tournament.status} />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Gamepad2Icon className="size-3.5 shrink-0 text-primary" />
                      <span className="font-semibold text-foreground/90">
                        {tournament.game}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-[0.7rem] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      {t('tournaments.createdOn', {
                        date: formatDate(tournament.created_at),
                      })}
                    </span>
                    <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      &rarr;
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
