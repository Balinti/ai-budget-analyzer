'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import * as guestStorage from '@/lib/storage/guest-storage'
import type { Profile, ManualBalance, Transaction, Anchor } from '@/types/database'

export function useDataAccess() {
  const { user, isGuest } = useAuth()
  const supabase = createClient()

  // Profile operations
  const getProfile = useCallback(async (): Promise<Profile | null> => {
    if (isGuest) {
      return guestStorage.guestProfile.get()
    }

    const { data, error } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('user_id', user!.id)
      .single()

    if (error) throw error
    return data
  }, [isGuest, user, supabase])

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<Profile> => {
      if (isGuest) {
        return guestStorage.guestProfile.update(updates)
      }

      const { data, error } = await (supabase.from('profiles') as any)
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    [isGuest, user, supabase]
  )

  // Balance operations
  const getBalance = useCallback(async (): Promise<ManualBalance | null> => {
    if (isGuest) {
      return guestStorage.guestBalance.get()
    }

    const { data, error } = await (supabase.from('manual_balances') as any)
      .select('*')
      .eq('user_id', user!.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }, [isGuest, user, supabase])

  const updateBalance = useCallback(
    async (updates: Partial<ManualBalance>): Promise<ManualBalance> => {
      if (isGuest) {
        return guestStorage.guestBalance.set(updates)
      }

      const { data, error } = await (supabase.from('manual_balances') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    [isGuest, user, supabase]
  )

  // Transaction operations
  const getTransactions = useCallback(
    async (limit?: number): Promise<Transaction[]> => {
      if (isGuest) {
        const all = guestStorage.guestTransactions.getAll()
        // Sort by date descending
        all.sort((a, b) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime())
        return limit ? all.slice(0, limit) : all
      }

      let query = (supabase.from('transactions') as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('txn_date', { ascending: false })

      if (limit) query = query.limit(limit)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    [isGuest, user, supabase]
  )

  const getTransactionCount = useCallback(async (): Promise<number> => {
    if (isGuest) {
      return guestStorage.guestTransactions.getAll().length
    }

    const { count, error } = await (supabase.from('transactions') as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)

    if (error) throw error
    return count || 0
  }, [isGuest, user, supabase])

  const insertTransactions = useCallback(
    async (
      transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at'>[]
    ): Promise<Transaction[]> => {
      if (isGuest) {
        return guestStorage.guestTransactions.insert(
          transactions.map((t) => ({ ...t, user_id: guestStorage.getGuestId() }))
        )
      }

      const withUserId = transactions.map((t) => ({ ...t, user_id: user!.id }))
      const { data, error } = await (supabase.from('transactions') as any)
        .insert(withUserId)
        .select()

      if (error) throw error
      return data || []
    },
    [isGuest, user, supabase]
  )

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      if (isGuest) {
        guestStorage.guestTransactions.delete(id)
        return
      }

      const { error } = await (supabase.from('transactions') as any).delete().eq('id', id)

      if (error) throw error
    },
    [isGuest, supabase]
  )

  // Anchor operations
  const getAnchors = useCallback(
    async (confirmedOnly = false): Promise<Anchor[]> => {
      if (isGuest) {
        const all = guestStorage.guestAnchors.getAll()
        return confirmedOnly ? all.filter((a) => a.confirmed) : all
      }

      let query = (supabase.from('anchors') as any).select('*').eq('user_id', user!.id)

      if (confirmedOnly) query = query.eq('confirmed', true)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    [isGuest, user, supabase]
  )

  const insertAnchor = useCallback(
    async (anchor: Omit<Anchor, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Anchor> => {
      if (isGuest) {
        return guestStorage.guestAnchors.insert({
          ...anchor,
          user_id: guestStorage.getGuestId(),
        })
      }

      const { data, error } = await (supabase.from('anchors') as any)
        .insert({ ...anchor, user_id: user!.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    [isGuest, user, supabase]
  )

  const updateAnchor = useCallback(
    async (id: string, updates: Partial<Anchor>): Promise<Anchor | null> => {
      if (isGuest) {
        return guestStorage.guestAnchors.update(id, updates)
      }

      const { data, error } = await (supabase.from('anchors') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    [isGuest, supabase]
  )

  const deleteAnchor = useCallback(
    async (id: string): Promise<void> => {
      if (isGuest) {
        guestStorage.guestAnchors.delete(id)
        return
      }

      const { error } = await (supabase.from('anchors') as any).delete().eq('id', id)

      if (error) throw error
    },
    [isGuest, supabase]
  )

  return {
    isGuest,
    // Profile
    getProfile,
    updateProfile,
    // Balance
    getBalance,
    updateBalance,
    // Transactions
    getTransactions,
    getTransactionCount,
    insertTransactions,
    deleteTransaction,
    // Anchors
    getAnchors,
    insertAnchor,
    updateAnchor,
    deleteAnchor,
  }
}
