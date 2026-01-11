'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { hasGuestData, getGuestId } from '@/lib/storage/guest-storage'

interface AuthContextType {
  user: User | null
  isGuest: boolean
  guestId: string | null
  isLoading: boolean
  hasLocalData: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isGuest: true,
  guestId: null,
  isLoading: true,
  hasLocalData: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLocalData, setHasLocalData] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // Check for local data
    setHasLocalData(hasGuestData())

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Recheck local data on auth change
      setHasLocalData(hasGuestData())
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const value: AuthContextType = {
    user,
    isGuest: !user,
    guestId: !user ? getGuestId() : null,
    isLoading,
    hasLocalData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
