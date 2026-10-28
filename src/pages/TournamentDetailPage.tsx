import * as React from 'react'
import { useParams, Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentsApi, teamsApi, matchesApi } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/api/queryKeys'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { StatusBadge } from '@/components/StatusBadge'
import { TournamentLifecycle } from '@/components/TournamentLifecycle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  UsersIcon,
  SwordsIcon,
  ShieldCheckIcon,
  PlusIcon,
  ChevronLeftIcon,
  SearchIcon,
  CrownIcon,
  MessageCircleIcon,
  AlertTriangleIcon,
  PlayIcon,
  LockIcon,
} from 'lucide-react'
import type { Team, Match, Tournament } from '@/lib/api/types'
import { toast } from 'sonner'

export function TournamentDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { user, isAuthenticated, isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = React.useState<string>('bracket')

  // Search in teams tab
  const [teamSearch, setTeamSearch] = React.useState('')

  // Create team dialog
  const [isCreateTeamOpen, setIsCreateTeamOpen] = React.useState(false)
  const [newTeamName, setNewTeamName] = React.useState('')
  const [newTeamRole, setNewTeamRole] = React.useState('')
  const [isCreatingTeam, setIsCreatingTeam] = React.useState(false)

  // Join team dialog
  const [joiningTeam, setJoiningTeam] = React.useState<Team | null>(null)
  const [joinRole, setJoinRole] = React.useState('')
  const [isJoining, setIsJoining] = React.useState(false)

  // Admin result entry dialog
  const [editingMatch, setEditingMatch] = React.useState<Match | null>(null)
  const [score1, setScore1] = React.useState<number>(0)
  const [score2, setScore2] = React.useState<number>(0)
  const [isSubmittingResult, setIsSubmittingResult] = React.useState(false)

  // Tournament query
  const {
    data: tournament,
    isLoading: isTournLoading,
    isError: isTournError,
  } = useQuery({
    queryKey: queryKeys.tournament(id),
    queryFn: () => tournamentsApi.get(id),
    enabled: !!id,
    refetchInterval: 10000, // Background poll B-19 fallback
  })

  // Teams query
  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: queryKeys.teams(id),
    queryFn: () => teamsApi.list(id),
    enabled: !!id,
    refetchInterval: 10000,
  })

  // Matches query (bracket)
  const { data: matches = [], isLoading: isMatchesLoading } = useQuery({
    queryKey: queryKeys.matches(id),
    queryFn: async () => {
      try {
        return await tournamentsApi.matches(id)
      } catch {
        return []
      }
    },
    enabled: !!id && tournament?.status !== 'registration_open',
    refetchInterval: 10000,
  })

  // Find user's team in this tournament
  const userTeam = React.useMemo(() => {
    if (!user) return null
    return teams.find((tm) => tm.members.some((m) => m.user_id === user.id)) || null
  }, [teams, user])

  const isCaptainOfUserTeam = userTeam && user && userTeam.captain_id === user.id

  // Create Team Action
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setIsCreatingTeam(true)
    try {
      const created = await teamsApi.create(id, newTeamName.trim(), newTeamRole.trim() || undefined)
      toast.success(t('teams.created', { name: created.name }))
      setIsCreateTeamOpen(false)
      setNewTeamName('')
      setNewTeamRole('')
      queryClient.invalidateQueries({ queryKey: queryKeys.teams(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsCreatingTeam(false)
    }
  }

  // Request Join Action
  const handleRequestJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joiningTeam) return

    setIsJoining(true)
    try {
      await teamsApi.requestJoin(joiningTeam.id, joinRole.trim() || undefined)
      toast.success(t('teams.joinSent'))
      setJoiningTeam(null)
      setJoinRole('')
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsJoining(false)
    }
  }

  // Admin close registration
  const handleCloseRegistration = async () => {
    if (!tournament) return
    try {
      await tournamentsApi.closeRegistration(tournament.id)
      toast.success(t('admin.closed'))
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    }
  }

  // Admin start tournament
  const handleStartTournament = async () => {
    if (!tournament) return
    try {
      await tournamentsApi.start(tournament.id)
      toast.success(t('admin.started'))
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    }
  }

  // Admin submit score
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMatch) return
    if (score1 === score2) {
      toast.error(t('bracket.noDraw'))
      return
    }

    setIsSubmittingResult(true)
    try {
      await matchesApi.submitResult(editingMatch.id, score1, score2)
      toast.success(t('bracket.resultSaved'))
      setEditingMatch(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.matches(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsSubmittingResult(false)
    }
  }

  // Admin declare forfeit
  const handleDeclareForfeit = async (matchId: string, teamId: string) => {
    try {
      await matchesApi.declareForfeit(matchId, teamId)
      toast.success(t('bracket.forfeitSaved'))
      setEditingMatch(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.matches(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    }
  }

  if (isTournLoading) {
    return (
      <div className="space-y-4 pb-nav">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (isTournError || !tournament) {
    return (
      <Empty className="border border-dashed p-8">
        <EmptyHeader>
          <TrophyIcon className="size-8 text-muted-foreground" />
          <EmptyTitle>{t('tournaments.notFound')}</EmptyTitle>
          <EmptyDescription>{t('tournaments.notFoundDescription')}</EmptyDescription>
        </EmptyHeader>
        <Link to="/" className="mt-4">
          <Button variant="outline" size="sm">
            {t('tournaments.backToList')}
          </Button>
        </Link>
      </Empty>
    )
  }

  const teamById = new Map<string, Team>(teams.map((tm) => [tm.id, tm]))

  const filteredTeams = teams.filter((tm) =>
    teamSearch ? tm.name.toLowerCase().includes(teamSearch.toLowerCase()) : true
  )

  return (
    <div className="space-y-6 pb-nav md:pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          <span>{t('tournaments.backToList')}</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {tournament.name}
            </h1>
            <p className="text-sm font-semibold text-primary">{tournament.game}</p>
          </div>
          <StatusBadge status={tournament.status} className="self-start sm:self-auto" />
        </div>

        {/* Lifecycle Stepper */}
        <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-xs">
          <TournamentLifecycle status={tournament.status} />
        </div>
      </div>

      {/* User's Team banner if participant */}
      {userTeam && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {isCaptainOfUserTeam ? t('myTeam.captainOf') : t('myTeam.memberOf')}
              </span>
              <h3 className="text-base font-bold text-foreground">{userTeam.name}</h3>
              <p className="text-xs text-muted-foreground">
                {t('teams.playersCount', {
                  count: userTeam.members_count || userTeam.members.length,
                  max: 5,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/teams/${userTeam.id}`}>
                <Button size="sm" variant="outline">
                  {t('myTeam.open')}
                </Button>
              </Link>
              <Link to={`/teams/${userTeam.id}/chat`}>
                <Button size="sm" className="gap-1.5">
                  <MessageCircleIcon className="size-3.5" />
                  <span>{t('myTeam.chat')}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => setActiveTab(val)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
          <TabsTrigger value="bracket" className="gap-1.5 text-xs sm:text-sm">
            <SwordsIcon className="size-4" />
            <span>{t('tournaments.tabs.bracket')}</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5 text-xs sm:text-sm">
            <UsersIcon className="size-4" />
            <span>{t('tournaments.tabs.teams')} ({teams.length})</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="admin"
              className="col-span-2 sm:col-span-1 gap-1.5 text-xs sm:text-sm"
            >
              <ShieldCheckIcon className="size-4" />
              <span>{t('tournaments.tabs.admin')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ---------------- BRACKET TAB ---------------- */}
        <TabsContent value="bracket" className="mt-4 space-y-4">
          {tournament.status === 'registration_open' ? (
            <Empty className="border border-dashed p-8">
              <EmptyHeader>
                <SwordsIcon className="size-8 text-muted-foreground" />
                <EmptyTitle>{t('bracket.notBuilt')}</EmptyTitle>
                <EmptyDescription>{t('bracket.notBuiltDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : matches.length === 0 ? (
            <Empty className="border border-dashed p-8">
              <EmptyHeader>
                <SwordsIcon className="size-8 text-muted-foreground" />
                <EmptyTitle>{t('bracket.empty')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-6">
              {/* Group matches by round */}
              {Array.from(new Set(matches.map((m) => m.round)))
                .sort((a, b) => a - b)
                .map((roundNum) => {
                  const roundMatches = matches
                    .filter((m) => m.round === roundNum)
                    .sort((a, b) => a.match_number - b.match_number)

                  return (
                    <div key={roundNum} className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {t('bracket.round', { n: roundNum })}
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {roundMatches.map((m) => {
                          const t1 = m.team1_id ? teamById.get(m.team1_id) : null
                          const t2 = m.team2_id ? teamById.get(m.team2_id) : null
                          const isFinished = m.status === 'completed' || m.status === 'forfeit'

                          return (
                            <Card key={m.id} className="overflow-hidden">
                              <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                                <span>{t('bracket.matchLabel', { n: m.match_number })}</span>
                                <span className="font-medium text-foreground capitalize">
                                  {m.status}
                                </span>
                              </div>

                              <div className="divide-y p-3">
                                {/* Team 1 */}
                                <div className="flex items-center justify-between py-1.5">
                                  <span
                                    className={`truncate text-sm ${
                                      m.winner_id && m.winner_id === m.team1_id
                                        ? 'font-bold text-foreground'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {t1 ? t1.name : t('bracket.tbd')}
                                  </span>
                                  <span className="font-mono text-sm font-bold tabular">
                                    {m.team1_score}
                                  </span>
                                </div>

                                {/* Team 2 */}
                                <div className="flex items-center justify-between py-1.5">
                                  <span
                                    className={`truncate text-sm ${
                                      m.winner_id && m.winner_id === m.team2_id
                                        ? 'font-bold text-foreground'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {t2 ? t2.name : t('bracket.tbd')}
                                  </span>
                                  <span className="font-mono text-sm font-bold tabular">
                                    {m.team2_score}
                                  </span>
                                </div>
                              </div>

                              {/* Admin Result Entry Button */}
                              {isAdmin && tournament.status === 'running' && !isFinished && t1 && t2 && (
                                <div className="border-t bg-muted/20 p-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => {
                                      setEditingMatch(m)
                                      setScore1(m.team1_score)
                                      setScore2(m.team2_score)
                                    }}
                                  >
                                    {t('bracket.enterResult')}
                                  </Button>
                                </div>
                              )}
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </TabsContent>

        {/* ---------------- TEAMS TAB ---------------- */}
        <TabsContent value="teams" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('teams.searchPlaceholder')}
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {tournament.status === 'registration_open' && isAuthenticated && !userTeam && (
              <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                <DialogTrigger
                  render={
                    <Button className="gap-1.5 shrink-0">
                      <PlusIcon className="size-4" />
                      <span>{t('teams.create')}</span>
                    </Button>
                  }
                />
                <DialogContent>
                  <form onSubmit={handleCreateTeam}>
                    <DialogHeader>
                      <DialogTitle>{t('teams.createTitle')}</DialogTitle>
                      <DialogDescription>
                        {t('teams.createDescription')}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-1.5">
                        <label htmlFor="team-name" className="text-sm font-medium">
                          {t('teams.name')}
                        </label>
                        <Input
                          id="team-name"
                          required
                          minLength={2}
                          maxLength={50}
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="team-role" className="text-sm font-medium">
                          {t('teams.yourRole')} ({t('common.optional')})
                        </label>
                        <Input
                          id="team-role"
                          placeholder={t('teams.rolePlaceholder')}
                          value={newTeamRole}
                          onChange={(e) => setNewTeamRole(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateTeamOpen(false)}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={isCreatingTeam}>
                        {isCreatingTeam ? t('common.loading') : t('common.save')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Teams list */}
          {filteredTeams.length === 0 ? (
            <Empty className="border border-dashed p-8">
              <EmptyHeader>
                <UsersIcon className="size-8 text-muted-foreground" />
                <EmptyTitle>{t('teams.empty')}</EmptyTitle>
                <EmptyDescription>{t('teams.emptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTeams.map((tm) => {
                const count = tm.members_count || tm.members.length
                const isFull = count >= 5
                const canJoin =
                  tournament.status === 'registration_open' &&
                  isAuthenticated &&
                  !userTeam &&
                  !isFull

                return (
                  <Card key={tm.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/teams/${tm.id}`}
                          className="font-bold hover:text-primary transition-colors"
                        >
                          {tm.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <CrownIcon className="size-3 text-amber-500" />
                          <span>
                            {tm.members.find((m) => m.user_id === tm.captain_id)
                              ?.username || t('teams.captain')}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isFull
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {t('teams.playersCount', { count, max: 5 })}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <Link to={`/teams/${tm.id}`}>
                        <Button variant="ghost" size="xs">
                          {t('teams.roster')}
                        </Button>
                      </Link>

                      {canJoin && (
                        <Button
                          size="xs"
                          onClick={() => {
                            setJoiningTeam(tm)
                            setJoinRole('')
                          }}
                        >
                          {t('teams.join')}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ---------------- ADMIN TAB ---------------- */}
        {isAdmin && (
          <TabsContent value="admin" className="mt-4 space-y-4">
            <Card className="p-5">
              <h3 className="text-base font-bold text-foreground">
                {t('admin.title')}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('admin.description')}
              </p>

              <div className="mt-6 flex flex-col gap-4">
                {tournament.status === 'registration_open' && (
                  <div className="rounded-lg border p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {t('admin.closeRegistration')}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t('admin.closeDescription', { count: teams.length })}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCloseRegistration}
                      disabled={teams.length < 2}
                    >
                      {t('admin.closeRegistration')}
                    </Button>
                  </div>
                )}

                {tournament.status === 'registration_closed' && (
                  <div className="rounded-lg border p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">{t('admin.start')}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t('admin.startDescription')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleStartTournament}
                      className="gap-1.5"
                    >
                      <PlayIcon className="size-3.5" />
                      <span>{t('admin.start')}</span>
                    </Button>
                  </div>
                )}

                {tournament.status === 'running' && (
                  <p className="text-xs text-muted-foreground">
                    {t('admin.runningInfo')}
                  </p>
                )}

                {tournament.status === 'finished' && (
                  <p className="text-xs text-muted-foreground">
                    {t('admin.finishedInfo')}
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Join Request Dialog */}
      <Dialog
        open={!!joiningTeam}
        onOpenChange={(open) => !open && setJoiningTeam(null)}
      >
        <DialogContent>
          <form onSubmit={handleRequestJoin}>
            <DialogHeader>
              <DialogTitle>
                {t('teams.joinTitle', { name: joiningTeam?.name || '' })}
              </DialogTitle>
              <DialogDescription>{t('teams.joinDescription')}</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label htmlFor="j-role" className="text-sm font-medium">
                {t('teams.yourRole')} ({t('common.optional')})
              </label>
              <Input
                id="j-role"
                className="mt-1.5"
                placeholder={t('teams.rolePlaceholder')}
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setJoiningTeam(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isJoining}>
                {isJoining ? t('common.loading') : t('teams.join')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Enter Score Dialog */}
      <Dialog
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
      >
        <DialogContent>
          <form onSubmit={handleSubmitScore}>
            <DialogHeader>
              <DialogTitle>{t('bracket.resultTitle')}</DialogTitle>
              <DialogDescription>
                {t('bracket.resultDescription')}
              </DialogDescription>
            </DialogHeader>

            {editingMatch && (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {t('bracket.score', {
                      team: teamById.get(editingMatch.team1_id || '')?.name || 'Équipe 1',
                    })}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={score1}
                    onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {t('bracket.score', {
                      team: teamById.get(editingMatch.team2_id || '')?.name || 'Équipe 2',
                    })}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={score2}
                    onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Forfeits alternative buttons */}
                <div className="pt-2">
                  <span className="text-xs font-semibold text-muted-foreground block mb-2">
                    {t('bracket.orForfeit')}
                  </span>
                  <div className="flex gap-2">
                    {editingMatch.team1_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-destructive"
                        onClick={() =>
                          handleDeclareForfeit(editingMatch.id, editingMatch.team1_id!)
                        }
                      >
                        {t('bracket.declareForfeit', {
                          team: teamById.get(editingMatch.team1_id)?.name || '',
                        })}
                      </Button>
                    )}
                    {editingMatch.team2_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-destructive"
                        onClick={() =>
                          handleDeclareForfeit(editingMatch.id, editingMatch.team2_id!)
                        }
                      >
                        {t('bracket.declareForfeit', {
                          team: teamById.get(editingMatch.team2_id)?.name || '',
                        })}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMatch(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmittingResult}>
                {isSubmittingResult ? t('common.loading') : t('bracket.submitResult')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
