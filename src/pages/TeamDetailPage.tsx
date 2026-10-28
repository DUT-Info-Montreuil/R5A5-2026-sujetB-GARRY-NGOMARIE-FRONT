import * as React from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi, tournamentsApi } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/api/queryKeys'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  UsersIcon,
  CrownIcon,
  MessageCircleIcon,
  PencilIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  DoorOpenIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react'
import type { TeamMember } from '@/lib/api/types'
import { toast } from 'sonner'

export function TeamDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { user, isAuthenticated, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Rename team dialog
  const [isRenameOpen, setIsRenameOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [isRenaming, setIsRenaming] = React.useState(false)

  // Assign role dialog
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null)
  const [newRole, setNewRole] = React.useState('')
  const [isAssigningRole, setIsAssigningRole] = React.useState(false)

  // Transfer captain dialog
  const [transferTarget, setTransferTarget] = React.useState<TeamMember | null>(null)
  const [isTransferring, setIsTransferring] = React.useState(false)

  // Exclude member dialog
  const [excludeTarget, setExcludeTarget] = React.useState<TeamMember | null>(null)
  const [isExcluding, setIsExcluding] = React.useState(false)

  // Team query
  const {
    data: team,
    isLoading: isTeamLoading,
    isError: isTeamError,
  } = useQuery({
    queryKey: queryKeys.team(id),
    queryFn: () => teamsApi.get(id),
    enabled: !!id,
  })

  // Tournament query
  const { data: tournament } = useQuery({
    queryKey: queryKeys.tournament(team?.tournament_id || ''),
    queryFn: () => tournamentsApi.get(team!.tournament_id),
    enabled: !!team?.tournament_id,
  })

  // Join requests query (only captain can view)
  const isCaptain = user && team && team.captain_id === user.id
  const isMember = user && team && team.members.some((m) => m.user_id === user.id)
  const canAccessChat = isMember || isAdmin
  const canManage = isCaptain && tournament?.status === 'registration_open'

  const { data: joinRequests = [] } = useQuery({
    queryKey: queryKeys.joinRequests(id),
    queryFn: () => teamsApi.joinRequests(id),
    enabled: !!id && !!isCaptain && tournament?.status === 'registration_open',
  })

  // Rename team
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setIsRenaming(true)
    try {
      await teamsApi.rename(id, newName.trim())
      toast.success(t('teams.renamed'))
      setIsRenameOpen(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsRenaming(false)
    }
  }

  // Assign role
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember || !newRole.trim()) return

    setIsAssigningRole(true)
    try {
      await teamsApi.assignRole(id, editingMember.id, newRole.trim())
      toast.success(t('teams.roleAssigned'))
      setEditingMember(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsAssigningRole(false)
    }
  }

  // Transfer captain
  const handleTransferCaptain = async () => {
    if (!transferTarget) return

    setIsTransferring(true)
    try {
      await teamsApi.transferCaptain(id, transferTarget.user_id)
      toast.success(t('teams.captainTransferred', { name: transferTarget.username || '' }))
      setTransferTarget(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsTransferring(false)
    }
  }

  // Exclude member
  const handleExclude = async () => {
    if (!excludeTarget) return

    setIsExcluding(true)
    try {
      await teamsApi.exclude(id, excludeTarget.id)
      toast.success(t('teams.excluded', { name: excludeTarget.username || '' }))
      setExcludeTarget(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    } finally {
      setIsExcluding(false)
    }
  }

  // Leave team
  const handleLeave = async () => {
    if (isCaptain && team.members.length > 1) {
      toast.error(t('teams.captainMustTransfer'))
      return
    }

    try {
      await teamsApi.leave(id)
      toast.success(t('teams.left'))
      navigate(`/tournaments/${team.tournament_id}`)
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    }
  }

  // Respond join request
  const handleJoinResponse = async (reqId: string, action: 'accept' | 'reject') => {
    try {
      await teamsApi.respondToJoinRequest(id, reqId, action)
      toast.success(action === 'accept' ? t('teams.accepted', { name: 'Joueur' }) : t('teams.rejected'))
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(id) })
    } catch (err: any) {
      toast.error(err?.detail || err?.message || t('errors.unknown'))
    }
  }

  if (isTeamLoading) {
    return <div className="p-8 text-center text-sm">{t('common.loading')}</div>
  }

  if (isTeamError || !team) {
    return (
      <Empty className="border border-dashed p-8">
        <EmptyHeader>
          <UsersIcon className="size-8 text-muted-foreground" />
          <EmptyTitle>{t('teams.notFound')}</EmptyTitle>
          <EmptyDescription>{t('teams.notFoundDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const isFull = team.members.length >= 5

  return (
    <div className="space-y-6 pb-nav md:pb-12">
      {/* Back to tournament */}
      <div>
        <Link
          to={`/tournaments/${team.tournament_id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          <span>{t('teams.backToTournament')}</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {team.name}
            </h1>
            {canManage && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setNewName(team.name)
                  setIsRenameOpen(true)
                }}
                aria-label={t('teams.rename')}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {tournament?.name || 'Tournoi'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAccessChat && (
            <Link to={`/teams/${team.id}/chat`}>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <MessageCircleIcon className="size-4" />
                <span>{t('teams.chatAction')}</span>
              </Button>
            </Link>
          )}

          {isMember && tournament?.status === 'registration_open' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              className="gap-1.5 text-destructive"
            >
              <DoorOpenIcon className="size-4" />
              <span>{t('teams.leave')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Roster Card */}
      <Card>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-foreground">{t('teams.roster')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('teams.playersCount', { count: team.members.length, max: 5 })}
            </p>
          </div>

          {tournament?.status !== 'registration_open' && (
            <span className="text-[0.7rem] font-medium text-muted-foreground">
              {t('teams.compositionFrozen')}
            </span>
          )}
        </div>

        <div className="divide-y">
          {team.members.map((member) => {
            const isMemberCaptain = member.user_id === team.captain_id
            const isSelf = user?.id === member.user_id

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                      isMemberCaptain
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isMemberCaptain ? (
                      <CrownIcon className="size-4" />
                    ) : (
                      member.username?.charAt(0).toUpperCase() || 'J'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      <span>{member.username || t('teams.unknownPlayer')}</span>
                      {isSelf && (
                        <span className="text-[0.7rem] font-normal text-muted-foreground">
                          ({t('common.you')})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {member.game_role || t('teams.noRole')}
                    </span>
                  </div>
                </div>

                {/* Captain Member Management Controls */}
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setEditingMember(member)
                        setNewRole(member.game_role || '')
                      }}
                    >
                      {t('teams.assignRole')}
                    </Button>

                    {!isMemberCaptain && (
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setTransferTarget(member)}
                        >
                          {t('teams.makeCaptain')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                          onClick={() => setExcludeTarget(member)}
                        >
                          <UserMinusIcon className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Open slots */}
          {Array.from({ length: Math.max(0, 5 - team.members.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 p-4 text-xs text-muted-foreground italic"
            >
              <div className="size-8 rounded-full border border-dashed border-muted-foreground/30" />
              <span>{t('teams.openSlot')}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Join Requests (Captain only) */}
      {isCaptain && tournament?.status === 'registration_open' && (
        <Card>
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">
              {t('teams.joinRequests')} ({joinRequests.length})
            </h2>
          </div>

          {joinRequests.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              {t('teams.noJoinRequests')}
            </p>
          ) : (
            <div className="divide-y">
              {joinRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold">
                      {req.username || 'Joueur'}
                    </span>
                    {req.game_role && (
                      <p className="text-xs text-muted-foreground">
                        {t('teams.wantsRole', { role: req.game_role })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      onClick={() => handleJoinResponse(req.id, 'accept')}
                      disabled={isFull}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckIcon className="size-3" />
                      <span>{t('teams.accept')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleJoinResponse(req.id, 'reject')}
                      className="gap-1 text-destructive"
                    >
                      <XIcon className="size-3" />
                      <span>{t('teams.reject')}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>{t('teams.renameTitle')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogContent>
          <form onSubmit={handleAssignRole}>
            <DialogHeader>
              <DialogTitle>
                {t('teams.assignRoleTitle', { name: editingMember?.username || '' })}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder={t('teams.rolePlaceholder')}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMember(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isAssigningRole}>
                {isAssigningRole ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Captain Dialog */}
      <Dialog
        open={!!transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('teams.makeCaptainTitle', { name: transferTarget?.username || '' })}
            </DialogTitle>
            <DialogDescription>
              {t('teams.makeCaptainDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferTarget(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleTransferCaptain}
              disabled={isTransferring}
            >
              {isTransferring ? t('common.loading') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclude Member Dialog */}
      <Dialog
        open={!!excludeTarget}
        onOpenChange={(open) => !open && setExcludeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('teams.excludeTitle', { name: excludeTarget?.username || '' })}
            </DialogTitle>
            <DialogDescription>
              {t('teams.excludeDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExcludeTarget(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleExclude}
              disabled={isExcluding}
            >
              {isExcluding ? t('common.loading') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
