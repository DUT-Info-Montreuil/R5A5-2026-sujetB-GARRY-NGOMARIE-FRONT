/** Centralised TanStack Query keys so invalidation stays consistent. */
export const queryKeys = {
  me: ['me'] as const,
  tournaments: ['tournaments'] as const,
  tournament: (id: string) => ['tournament', id] as const,
  teams: (tournamentId: string) => ['teams', tournamentId] as const,
  teamSearch: (tournamentId: string, search: string) =>
    ['teams', tournamentId, { search }] as const,
  team: (teamId: string) => ['team', teamId] as const,
  joinRequests: (teamId: string) => ['joinRequests', teamId] as const,
  matches: (tournamentId: string) => ['matches', tournamentId] as const,
  messages: (teamId: string) => ['messages', teamId] as const,
}
