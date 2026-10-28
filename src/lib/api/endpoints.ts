import { ApiError, request } from './client'
import type {
  JoinRequest,
  Match,
  Message,
  Team,
  Tournament,
  User,
} from './types'

const V1 = '/api/v1'

/* ------------------------------------------------------------------ auth */

export const authApi = {
  /** Current user, or `null` for a visitor (401). */
  async me(): Promise<User | null> {
    try {
      return await request<User>(`${V1}/auth/me`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  login: (identifier: string, password: string) =>
    request<User>(`${V1}/auth/login`, { method: 'POST', body: { identifier, password } }),
  register: (username: string, email: string, password: string) =>
    request<User>(`${V1}/auth/register`, {
      method: 'POST',
      body: { username, email, password },
    }),
  logout: () => request<void>(`${V1}/auth/logout`, { method: 'POST' }),
  /** Full-page navigation target: the backend redirects to Discord. */
  discordLoginPath: `${V1}/auth/discord/login`,
}

/* ----------------------------------------------------------- tournaments */

export const tournamentsApi = {
  list: () => request<Tournament[]>(`${V1}/tournaments`),

  /**
   * Single tournament. Falls back to the public list when the backend does not
   * expose `GET /tournaments/{id}` yet, so the page works on every API version.
   */
  async get(id: string): Promise<Tournament> {
    try {
      return await request<Tournament>(`${V1}/tournaments/${id}`)
    } catch (error) {
      if (!(error instanceof ApiError) || !error.isNotImplemented) throw error
      const all = await tournamentsApi.list()
      const found = all.find((t) => t.id === id)
      if (!found) throw new ApiError(404, 'Tournament not found')
      return found
    }
  },

  create: (name: string, game: string) =>
    request<Tournament>(`${V1}/tournaments`, { method: 'POST', body: { name, game } }),

  // --- Admin lifecycle (B-03, B-04). Contract documented in README.md.
  closeRegistration: (id: string) =>
    request<Tournament>(`${V1}/tournaments/${id}/close-registration`, { method: 'POST' }),
  start: (id: string) => request<Tournament>(`${V1}/tournaments/${id}/start`, { method: 'POST' }),

  // --- Bracket (B-12, B-14)
  matches: (id: string) => request<Match[]>(`${V1}/tournaments/${id}/matches`),

  /** WebSocket path for public live follow-up (B-19). */
  wsPath: (id: string) => `${V1}/tournaments/${id}/ws`,
}

/* --------------------------------------------------------------- matches */

export const matchesApi = {
  /** Admin enters a result (B-13); the backend advances the winner (B-14). */
  submitResult: (matchId: string, team1Score: number, team2Score: number) =>
    request<Match>(`${V1}/matches/${matchId}/result`, {
      method: 'POST',
      body: { team1_score: team1Score, team2_score: team2Score },
    }),
  /** Admin declares a team forfeit; its opponent qualifies (B-15). */
  declareForfeit: (matchId: string, forfeitingTeamId: string) =>
    request<Match>(`${V1}/matches/${matchId}/forfeit`, {
      method: 'POST',
      body: { forfeiting_team_id: forfeitingTeamId },
    }),
}

/* ----------------------------------------------------------------- teams */

export const teamsApi = {
  list: (tournamentId: string, search?: string) =>
    request<Team[]>(`${V1}/tournaments/${tournamentId}/teams`, { query: { search } }),
  get: (teamId: string) => request<Team>(`${V1}/teams/${teamId}`),
  create: (tournamentId: string, name: string, gameRole?: string) =>
    request<Team>(`${V1}/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      body: { name, game_role: gameRole || null },
    }),
  requestJoin: (teamId: string, gameRole?: string) =>
    request<JoinRequest>(`${V1}/teams/${teamId}/join`, {
      method: 'POST',
      body: { game_role: gameRole || null },
    }),
  joinRequests: (teamId: string) => request<JoinRequest[]>(`${V1}/teams/${teamId}/join-requests`),
  respondToJoinRequest: (teamId: string, requestId: string, action: 'accept' | 'reject') =>
    request<Team>(`${V1}/teams/${teamId}/join-requests/${requestId}/${action}`, {
      method: 'POST',
    }),
  leave: (teamId: string) => request<unknown>(`${V1}/teams/${teamId}/leave`, { method: 'POST' }),
  rename: (teamId: string, name: string) =>
    request<Team>(`${V1}/teams/${teamId}/name`, { method: 'PATCH', body: { name } }),
  assignRole: (teamId: string, memberId: string, gameRole: string) =>
    request<Team>(`${V1}/teams/${teamId}/members/${memberId}/role`, {
      method: 'PATCH',
      body: { game_role: gameRole },
    }),
  exclude: (teamId: string, memberId: string) =>
    request<Team>(`${V1}/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }),
  transferCaptain: (teamId: string, newCaptainUserId: string) =>
    request<Team>(`${V1}/teams/${teamId}/transfer-captain`, {
      method: 'POST',
      body: { new_captain_id: newCaptainUserId },
    }),
}

/* ------------------------------------------------------------------ chat */

export const chatApi = {
  history: (teamId: string) => request<Message[]>(`${V1}/teams/${teamId}/messages`),
  post: (teamId: string, content: string) =>
    request<Message>(`${V1}/teams/${teamId}/messages`, { method: 'POST', body: { content } }),
  wsPath: (teamId: string) => `${V1}/teams/${teamId}/ws`,
}
