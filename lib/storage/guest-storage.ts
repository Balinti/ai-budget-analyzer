import type { Profile, ManualBalance, Transaction, Anchor } from '@/types/database'

const STORAGE_KEYS = {
  GUEST_ID: 'budget_guest_id',
  GUEST_SESSION_START: 'budget_guest_session_start',
  PROFILE: 'budget_guest_profile',
  BALANCE: 'budget_guest_balance',
  TRANSACTIONS: 'budget_guest_transactions',
  ANCHORS: 'budget_guest_anchors',
} as const

// Guest session duration in milliseconds (5 minutes)
export const GUEST_SESSION_DURATION_MS = 5 * 60 * 1000

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Generate or retrieve guest ID
export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  let guestId = localStorage.getItem(STORAGE_KEYS.GUEST_ID)
  if (!guestId) {
    guestId = `guest_${generateId()}`
    localStorage.setItem(STORAGE_KEYS.GUEST_ID, guestId)
  }
  return guestId
}

// Guest session timer functions
export function getGuestSessionStart(): number | null {
  if (typeof window === 'undefined') return null
  const start = localStorage.getItem(STORAGE_KEYS.GUEST_SESSION_START)
  return start ? parseInt(start, 10) : null
}

export function startGuestSession(): number {
  if (typeof window === 'undefined') return Date.now()
  const existing = getGuestSessionStart()
  if (existing) return existing

  const now = Date.now()
  localStorage.setItem(STORAGE_KEYS.GUEST_SESSION_START, now.toString())
  return now
}

export function getGuestTimeRemaining(): number {
  const start = getGuestSessionStart()
  if (!start) return GUEST_SESSION_DURATION_MS

  const elapsed = Date.now() - start
  const remaining = GUEST_SESSION_DURATION_MS - elapsed
  return Math.max(0, remaining)
}

export function isGuestSessionExpired(): boolean {
  return getGuestTimeRemaining() <= 0
}

export function resetGuestSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION_START)
}

export function extendGuestSession(extraMs: number = 2 * 60 * 1000): void {
  if (typeof window === 'undefined') return
  const start = getGuestSessionStart()
  if (!start) return
  // Move the start time forward to give more time
  const newStart = start + extraMs
  localStorage.setItem(STORAGE_KEYS.GUEST_SESSION_START, newStart.toString())
}

export function hasGuestData(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    localStorage.getItem(STORAGE_KEYS.PROFILE) ||
    localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ||
    localStorage.getItem(STORAGE_KEYS.ANCHORS)
  )
}

// Profile operations
export const guestProfile = {
  get(): Profile | null {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE)
    return data ? JSON.parse(data) : null
  },

  set(profile: Partial<Profile>): Profile {
    const existing = this.get()
    const updated: Profile = {
      user_id: getGuestId(),
      timezone: 'America/New_York',
      currency: 'USD',
      buffer_cents: 20000,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      ...existing,
      ...profile,
    }
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated))
    return updated
  },

  update(updates: Partial<Profile>): Profile {
    return this.set(updates)
  },
}

// ManualBalance operations
export const guestBalance = {
  get(): ManualBalance | null {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(STORAGE_KEYS.BALANCE)
    return data ? JSON.parse(data) : null
  },

  set(balance: Partial<ManualBalance>): ManualBalance {
    const existing = this.get()
    const updated: ManualBalance = {
      user_id: getGuestId(),
      checking_cents: 0,
      savings_cents: 0,
      updated_at: new Date().toISOString(),
      ...existing,
      ...balance,
    }
    localStorage.setItem(STORAGE_KEYS.BALANCE, JSON.stringify(updated))
    return updated
  },
}

// Transaction operations
export const guestTransactions = {
  getAll(): Transaction[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
    return data ? JSON.parse(data) : []
  },

  insert(transactions: Omit<Transaction, 'id' | 'created_at'>[]): Transaction[] {
    const existing = this.getAll()
    const newTxns = transactions.map((t) => ({
      ...t,
      id: generateId(),
      user_id: getGuestId(),
      created_at: new Date().toISOString(),
    }))
    const updated = [...existing, ...newTxns]
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated))
    return newTxns
  },

  delete(id: string): void {
    const existing = this.getAll()
    const updated = existing.filter((t) => t.id !== id)
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated))
  },

  clear(): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]))
  },
}

// Anchor operations
export const guestAnchors = {
  getAll(): Anchor[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.ANCHORS)
    return data ? JSON.parse(data) : []
  },

  insert(anchor: Omit<Anchor, 'id' | 'created_at' | 'updated_at'>): Anchor {
    const existing = this.getAll()
    const newAnchor: Anchor = {
      ...anchor,
      id: generateId(),
      user_id: getGuestId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.ANCHORS, JSON.stringify([...existing, newAnchor]))
    return newAnchor
  },

  update(id: string, updates: Partial<Anchor>): Anchor | null {
    const existing = this.getAll()
    const index = existing.findIndex((a) => a.id === id)
    if (index === -1) return null

    existing[index] = {
      ...existing[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.ANCHORS, JSON.stringify(existing))
    return existing[index]
  },

  delete(id: string): void {
    const existing = this.getAll()
    const updated = existing.filter((a) => a.id !== id)
    localStorage.setItem(STORAGE_KEYS.ANCHORS, JSON.stringify(updated))
  },
}

// Export all guest data for merge
export function exportAllGuestData() {
  return {
    profile: guestProfile.get(),
    balance: guestBalance.get(),
    transactions: guestTransactions.getAll(),
    anchors: guestAnchors.getAll(),
  }
}

// Clear all guest data after merge
export function clearAllGuestData(): void {
  if (typeof window === 'undefined') return
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
