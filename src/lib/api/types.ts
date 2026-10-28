/**
 * Shapes returned by the FastAPI backend (`back/app/schemas`).
 * Keep in sync with the backend Pydantic models.
 */

export type GlobalRole = 'player' | 'admin'

export interface User {
  id: string
  username: string
  global_role: GlobalRole | string
}

export type TournamentStatus =
  | 'registration_open'
  | 'registration_closed'
  | 'running'
  | 'finished'

export const TOURNAMENT_STATUSES: readonly TournamentStatus[] = [
  'registration_open',
  'registration_closed',
  'running',
  'finished',
]

export interface Tournament {
  id: string
  name: string
  game: string
  status: TournamentStatus
  created_by: string | null
  created_at: string
  registration_closed_at: string | null
}

export interface TeamMember {
  id: string
  user_id: string
  username: string | null
  game_role: string | null
  joined_at: string
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  captain_id: string
  is_eliminated: boolean
  created_at: string
  members_count: number
  members: TeamMember[]
}

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface JoinRequest {
  id: string
  team_id: string
  user_id: string
  username: string | null
  tournament_id: string
  game_role: string | null
  status: JoinRequestStatus
  created_at: string
  responded_at: string | null
}

export interface Message {
  id: string
  team_id: string
  author_id: string | null
  author_username: string | null
  content: string
  created_at: string
}

export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'forfeit'

export interface Match {
  id: string
  tournament_id: string
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  winner_id: string | null
  team1_score: number
  team2_score: number
  status: MatchStatus
  next_match_id: string | null
  next_match_slot: number | null
}

/** Team size fixed by the subject (B-08). */
export const TEAM_SIZE = 5

/** Backend limit (`chat_message_max_length`). */
export const CHAT_MAX_LENGTH = 2000
