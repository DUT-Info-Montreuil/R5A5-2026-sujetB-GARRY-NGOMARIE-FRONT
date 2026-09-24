import type { User } from '@/types/auth'

// Empty in dev (Vite proxies /api); set VITE_API_BASE_URL for a separate API origin.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// The single REST entry point. The session lives in an HttpOnly cookie, so every
// call must send credentials; the browser adds the Origin header the API checks.
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // FastAPI validation errors (422) carry a list; show the first message.
    const detail = Array.isArray(body?.detail) ? body.detail[0]?.msg : body?.detail
    throw new ApiError(response.status, detail ?? response.statusText)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const discordLoginUrl = `${BASE_URL}/api/v1/auth/discord/login`

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export const register = (input: RegisterInput) =>
  postJson<User>('/api/v1/auth/register', input)

// `identifier` is the username or the email.
export const login = (identifier: string, password: string) =>
  postJson<User>('/api/v1/auth/login', { identifier, password })

export const getMe = () => request<User>('/api/v1/auth/me')

export const logout = () => request<void>('/api/v1/auth/logout', { method: 'POST' })
