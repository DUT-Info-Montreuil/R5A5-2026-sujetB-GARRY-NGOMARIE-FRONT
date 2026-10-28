import * as React from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { tournamentsApi, teamsApi } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/api/queryKeys'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { UsersIcon, CrownIcon, MessageCircleIcon, TrophyIcon } from 'lucide-react'
import type { Team, Tournament } from '@/lib/api/types'

export function MyTeamsPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  // Fetch all tournaments first
  const { data: tournaments = [], isLoading: isTournLoading } = useQuery({
    queryKey: queryKeys.tournaments,
    queryFn: tournamentsApi.list,
  })

  // Fetch teams for each tournament in parallel
  const [userTeams, setUserTeams] = React.useState<
    { team: Team; tournament: Tournament }[]
  >([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user || tournaments.length === 0) {
      setUserTeams([])
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    Promise.all(
      tournaments.map(async (tourn) => {
        try {
          const teams = await teamsApi.list(tourn.id)
          const myTeam = teams.find((tm) =>
            tm.members.some((m) => m.user_id === user.id)
          )
          if (myTeam) {
            return { team: myTeam, tournament: tourn }
          }
        } catch {
          // ignore error per tournament
        }
        return null
      })
    ).then((results) => {
      if (isMounted) {
        setUserTeams(
          results.filter((r): r is { team: Team; tournament: Tournament } => !!r)
        )
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [user, tournaments])

  return (
    <div className="space-y-6 pb-nav md:pb-12">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {t('myTeams.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('myTeams.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm">{t('common.loading')}</div>
      ) : userTeams.length === 0 ? (
        <Empty className="border border-dashed p-8">
          <EmptyHeader>
            <UsersIcon className="size-8 text-muted-foreground" />
            <EmptyTitle>{t('myTeams.empty')}</EmptyTitle>
            <EmptyDescription>{t('myTeams.emptyDescription')}</EmptyDescription>
          </EmptyHeader>
          <Link to="/" className="mt-4">
            <Button variant="outline" size="sm">
              {t('myTeams.browse')}
            </Button>
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {userTeams.map(({ team, tournament }) => {
            const isCaptain = team.captain_id === user?.id
            const memberInfo = team.members.find((m) => m.user_id === user?.id)

            return (
              <Card key={team.id} className="p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-primary">
                        {tournament.name}
                      </span>
                      <h2 className="text-base font-bold text-foreground">
                        {team.name}
                      </h2>
                    </div>

                    {isCaptain ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <CrownIcon className="size-3" />
                        {t('teams.captain')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {memberInfo?.game_role || t('teams.noRole')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('teams.playersCount', { count: team.members.length, max: 5 })}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <Link to={`/teams/${team.id}`}>
                    <Button variant="ghost" size="xs">
                      {t('teams.roster')}
                    </Button>
                  </Link>

                  <Link to={`/teams/${team.id}/chat`}>
                    <Button size="xs" className="gap-1.5">
                      <MessageCircleIcon className="size-3.5" />
                      <span>{t('myTeam.chat')}</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
