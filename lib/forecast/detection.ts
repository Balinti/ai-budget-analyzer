import type { Transaction, Anchor, AnchorCadence, AnchorType } from '@/types/database'
import { differenceInDays, parseISO, format } from 'date-fns'

interface TransactionGroup {
  description: string
  transactions: Transaction[]
  avgAmount: number
  minAmount: number
  maxAmount: number
  frequency: number // average days between occurrences
  suggestedCadence: AnchorCadence
  suggestedType: AnchorType
  isVariable: boolean
}

// Normalize description for grouping
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3) // Take first 3 words
    .join(' ')
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Check if two descriptions are similar enough to group
function areSimilar(desc1: string, desc2: string): boolean {
  const norm1 = normalizeDescription(desc1)
  const norm2 = normalizeDescription(desc2)

  if (norm1 === norm2) return true

  const maxLen = Math.max(norm1.length, norm2.length)
  if (maxLen === 0) return true

  const distance = levenshteinDistance(norm1, norm2)
  const similarity = 1 - distance / maxLen

  return similarity >= 0.7 // 70% similarity threshold
}

// Determine cadence from average frequency in days
function detectCadence(avgDays: number): AnchorCadence {
  if (avgDays <= 10) return 'weekly'
  if (avgDays <= 18) return 'biweekly'
  if (avgDays <= 45) return 'monthly'
  if (avgDays <= 100) return 'quarterly'
  if (avgDays <= 400) return 'yearly'
  return 'unknown'
}

// Calculate average days between transactions
function calculateAverageFrequency(transactions: Transaction[]): number {
  if (transactions.length < 2) return 30 // default to monthly

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.txn_date).getTime() - new Date(b.txn_date).getTime()
  )

  let totalDays = 0
  for (let i = 1; i < sorted.length; i++) {
    totalDays += differenceInDays(
      parseISO(sorted[i].txn_date),
      parseISO(sorted[i - 1].txn_date)
    )
  }

  return totalDays / (sorted.length - 1)
}

// Detect recurring patterns in transactions
export function detectRecurring(transactions: Transaction[]): TransactionGroup[] {
  const groups: Map<string, Transaction[]> = new Map()

  // Group transactions by normalized description with fuzzy matching
  for (const txn of transactions) {
    const normDesc = normalizeDescription(txn.description)
    let foundGroup = false

    for (const [key, group] of groups) {
      if (areSimilar(normDesc, key)) {
        group.push(txn)
        foundGroup = true
        break
      }
    }

    if (!foundGroup) {
      groups.set(normDesc, [txn])
    }
  }

  // Analyze each group for recurring patterns
  const recurringGroups: TransactionGroup[] = []

  for (const [_, txns] of groups) {
    if (txns.length < 2) continue // Need at least 2 occurrences

    const amounts = txns.map((t) => Math.abs(t.amount_cents))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const minAmount = Math.min(...amounts)
    const maxAmount = Math.max(...amounts)

    // Check if amounts are consistent (within 30% variance)
    const amountVariance = (maxAmount - minAmount) / avgAmount
    if (amountVariance > 0.5) continue // Skip highly variable amounts

    const frequency = calculateAverageFrequency(txns)
    const suggestedCadence = detectCadence(frequency)

    // Skip if frequency suggests it's not recurring
    if (suggestedCadence === 'unknown') continue

    // Determine type based on amount sign
    const avgSign = txns.reduce((sum, t) => sum + Math.sign(t.amount_cents), 0) / txns.length
    const suggestedType: AnchorType = avgSign > 0 ? 'income' : 'bill'

    recurringGroups.push({
      description: txns[0].description, // Use original description
      transactions: txns,
      avgAmount,
      minAmount,
      maxAmount,
      frequency,
      suggestedCadence,
      suggestedType,
      isVariable: amountVariance > 0.1,
    })
  }

  // Sort by frequency of occurrence (most frequent first)
  return recurringGroups.sort((a, b) => b.transactions.length - a.transactions.length)
}

// Convert detected group to anchor suggestion
export function groupToAnchorSuggestion(
  group: TransactionGroup,
  userId: string
): Omit<Anchor, 'id' | 'created_at' | 'updated_at'> {
  const lastTxn = group.transactions.reduce((latest, txn) =>
    new Date(txn.txn_date) > new Date(latest.txn_date) ? txn : latest
  )

  // Calculate suggested due day based on most common day
  const dayOfMonth = group.transactions.map((t) => new Date(t.txn_date).getDate())
  const dayCounts = dayOfMonth.reduce((acc, day) => {
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  const mostCommonDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  return {
    user_id: userId,
    type: group.suggestedType,
    name: group.description,
    cadence: group.suggestedCadence,
    due_day: mostCommonDay ? parseInt(mostCommonDay) : null,
    next_due_date: null, // Will be calculated
    amount_min_cents: group.suggestedType === 'bill' ? -Math.round(group.maxAmount) : Math.round(group.minAmount),
    amount_max_cents: group.suggestedType === 'bill' ? -Math.round(group.minAmount) : Math.round(group.maxAmount),
    required: true,
    variable: group.isVariable,
    confirmed: false,
    last_matched_txn_id: lastTxn.id,
  }
}

// Calculate percentile of amounts (for income gap warnings)
export function calculatePercentile(amounts: number[], percentile: number): number {
  if (amounts.length === 0) return 0

  const sorted = [...amounts].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

// Estimate next occurrence date for an anchor
export function estimateNextOccurrence(
  anchor: Anchor,
  fromDate: Date = new Date()
): Date | null {
  const { cadence, due_day, next_due_date } = anchor

  // If explicit next_due_date is set, use it
  if (next_due_date) {
    const nextDate = parseISO(next_due_date)
    if (nextDate > fromDate) return nextDate
  }

  if (!due_day) return null

  const currentDate = new Date(fromDate)
  let nextDate = new Date(currentDate)

  switch (cadence) {
    case 'weekly':
      // due_day is day of week (0-6, Sunday = 0)
      const currentDayOfWeek = currentDate.getDay()
      const daysUntil = (due_day - currentDayOfWeek + 7) % 7 || 7
      nextDate.setDate(currentDate.getDate() + daysUntil)
      break

    case 'biweekly':
      // Same as weekly but add 14 days if within first week
      const currentDow = currentDate.getDay()
      const biweeklyDaysUntil = (due_day - currentDow + 7) % 7 || 7
      nextDate.setDate(currentDate.getDate() + biweeklyDaysUntil)
      // This is simplified - real biweekly would track from first occurrence
      break

    case 'monthly':
      // due_day is day of month (1-31)
      nextDate.setDate(due_day)
      if (nextDate <= currentDate) {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      // Handle months with fewer days
      while (nextDate.getDate() !== due_day) {
        nextDate.setDate(0) // Go to last day of previous month
      }
      break

    case 'quarterly':
      nextDate.setDate(due_day)
      if (nextDate <= currentDate) {
        nextDate.setMonth(nextDate.getMonth() + 3)
      }
      break

    case 'yearly':
      nextDate.setDate(due_day)
      if (nextDate <= currentDate) {
        nextDate.setFullYear(nextDate.getFullYear() + 1)
      }
      break

    default:
      return null
  }

  return nextDate
}
