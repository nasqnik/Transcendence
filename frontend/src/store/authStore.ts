import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'parent' | 'child'
}

interface AuthStore {
  currentUser: User | null
  token: string | null
  isAuthenticated: boolean

  login: (user: User, token: string) => void
  logout: () => void
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({
        currentUser: user,
        token,
        isAuthenticated: true,
      }),

      logout: () => set({
        currentUser: null,
        token: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'auth',
    }
  )
)

export default useAuthStore
