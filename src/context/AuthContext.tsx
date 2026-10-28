import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/api/queryKeys'
import type { User } from '@/lib/api/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (identifier: string, password: string) => Promise<User>
  register: (username: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refetchUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      authApi.login(identifier, password),
    onSuccess: (newUser) => {
      queryClient.setQueryData(queryKeys.me, newUser)
      queryClient.invalidateQueries()
    },
  })

  const registerMutation = useMutation({
    mutationFn: ({
      username,
      email,
      password,
    }: {
      username: string
      email: string
      password: string
    }) => authApi.register(username, email, password),
    onSuccess: (newUser) => {
      queryClient.setQueryData(queryKeys.me, newUser)
      queryClient.invalidateQueries()
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.me, null)
      queryClient.invalidateQueries()
    },
  })

  const login = React.useCallback(
    async (identifier: string, password: string) => {
      return await loginMutation.mutateAsync({ identifier, password })
    },
    [loginMutation]
  )

  const register = React.useCallback(
    async (username: string, email: string, password: string) => {
      return await registerMutation.mutateAsync({ username, email, password })
    },
    [registerMutation]
  )

  const logout = React.useCallback(async () => {
    await logoutMutation.mutateAsync()
  }, [logoutMutation])

  const refetchUser = React.useCallback(async () => {
    await refetch()
  }, [refetch])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.global_role === 'admin',
      login,
      register,
      logout,
      refetchUser,
    }),
    [user, isLoading, login, register, logout, refetchUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
