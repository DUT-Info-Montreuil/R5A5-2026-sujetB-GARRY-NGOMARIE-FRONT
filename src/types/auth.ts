// Mirrors BACK app/routers/auth.py UserResponse.
export type GlobalRole = 'player' | 'admin'

export interface User {
  id: string
  username: string
  global_role: GlobalRole
}
