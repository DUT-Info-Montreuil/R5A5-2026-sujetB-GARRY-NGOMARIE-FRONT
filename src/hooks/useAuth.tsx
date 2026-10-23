import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  ApiError,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type RegisterInput,
} from '@/api/client'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((error: unknown) => {
        // 401 just means "visitor"; anything else is a real failure.
        if (!(error instanceof ApiError && error.status === 401)) console.error(error)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Both set the session cookie server-side and return the user.
  const login = useCallback(async (identifier: string, password: string) => {
    setUser(await apiLogin(identifier, password))
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    setUser(await apiRegister(input))
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
