import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email?: string
  role: 'parent' | 'kid'
}

interface AuthStore {
  currentUser: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login: (user: User, token: string, refreshToken: string) => void
  updateUser: (partial: Partial<User>) => void
  logout: () => void
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, token, refreshToken) => set({
        currentUser: user,
        token,
        refreshToken,
        isAuthenticated: true,
      }),

      updateUser: (partial) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...partial } : state.currentUser,
      })),

      logout: () => set({
        currentUser: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'auth',
    }
  )
)

export default useAuthStore
