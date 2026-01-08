import type { Anchor, ManualBalance, Profile, Forecast } from '@/types/database'
import { estimateNextOccurrence, calculatePercentile } from './detection'
import { addDays, format, differenceInDays, startOfDay, endOfDay } from 'date-fns'

export interface ForecastEvent {
  date: Date
  type: 'bill' | 'income'
  name: string
  amount_cents: number
  anchor_id: string
  is_required: boolean
}

export interface DailyForecast {
  date: Date
  projected_balance_cents: number
  safe_to_spend_cents: number
  events: ForecastEvent[]
  risk_level: 'none' | 'low' | 'medium' | 'high'
}

export interface SafeToSpendResult {
  today: number
  thisWeek: number
  currentBalance: number
  upcomingBills: number
  expectedIncome: number
  buffer: number
  riskDays: DailyForecast[]
  dailyForecasts: DailyForecast[]
  incomeGapWarning: string | null
}

// Get horizon days based on plan tier
export function getHorizonDays(tier: 'free' | 'plus' | 'pro'): number {
  switch (tier) {
    case 'pro':
      return 60
    case 'plus':
      return 30
    default:
      return 7
  }
}

// Get max anchors based on plan tier
export function getMaxAnchors(tier: 'free' | 'plus' | 'pro'): number {
  switch (tier) {
    case 'pro':
      return Infinity
    case 'plus':
      return 20
    default:
      return 5
  }
}

// Generate forecast events for the horizon period
export function generateForecastEvents(
  anchors: Anchor[],
  startDate: Date,
  horizonDays: number,
  historicalAmounts?: Map<string, number[]> // For variable income estimation
): ForecastEvent[] {
  const events: ForecastEvent[] = []
  const endDate = addDays(startDate, horizonDays)

  for (const anchor of anchors) {
    if (!anchor.confirmed) continue

    let nextDate = estimateNextOccurrence(anchor, startDate)

    while (nextDate && nextDate <= endDate) {
      // For variable anchors, use median of historical amounts
      let amount = Math.round((anchor.amount_min_cents + anchor.amount_max_cents) / 2)

      if (anchor.variable && historicalAmounts?.has(anchor.id)) {
        const amounts = historicalAmounts.get(anchor.id)!
        // Use median for bills, 25th percentile for income (conservative)
        if (anchor.type === 'income') {
          amount = calculatePercentile(amounts, 25) // Conservative income estimate
        } else {
          amount = calculatePercentile(amounts, 75) // Higher bill estimate
        }
      }

      events.push({
        date: nextDate,
        type: anchor.type,
        name: anchor.name,
        amount_cents: anchor.type === 'bill' ? -Math.abs(amount) : Math.abs(amount),
        anchor_id: anchor.id,
        is_required: anchor.required,
      })

      // Move to next occurrence based on cadence
      switch (anchor.cadence) {
        case 'weekly':
          nextDate = addDays(nextDate, 7)
          break
        case 'biweekly':
          nextDate = addDays(nextDate, 14)
          break
        case 'monthly':
          nextDate = new Date(nextDate)
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'quarterly':
          nextDate = new Date(nextDate)
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'yearly':
          nextDate = new Date(nextDate)
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
        default:
          nextDate = null
      }
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Calculate risk level based on projected balance vs buffer
function calculateRiskLevel(
  projectedBalance: number,
  buffer: number
): 'none' | 'low' | 'medium' | 'high' {
  if (projectedBalance < 0) return 'high'
  if (projectedBalance < buffer * 0.5) return 'medium'
  if (projectedBalance < buffer) return 'low'
  return 'none'
}

// Generate daily forecasts
export function generateDailyForecasts(
  currentBalance: number,
  buffer: number,
  events: ForecastEvent[],
  horizonDays: number
): DailyForecast[] {
  const forecasts: DailyForecast[] = []
  const startDate = startOfDay(new Date())
  let runningBalance = currentBalance

  for (let i = 0; i <= horizonDays; i++) {
    const date = addDays(startDate, i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    // Get events for this day
    const dayEvents = events.filter(
      (e) => e.date >= dayStart && e.date <= dayEnd
    )

    // Apply events to balance
    for (const event of dayEvents) {
      runningBalance += event.amount_cents
    }

    forecasts.push({
      date,
      projected_balance_cents: runningBalance,
      safe_to_spend_cents: 0, // Will be calculated
      events: dayEvents,
      risk_level: calculateRiskLevel(runningBalance, buffer),
    })
  }

  return forecasts
}

// Calculate safe-to-spend for today and this week
export function calculateSafeToSpend(
  balance: ManualBalance,
  profile: Profile,
  anchors: Anchor[],
  tier: 'free' | 'plus' | 'pro' = 'free',
  includeSavings: boolean = false,
  historicalAmounts?: Map<string, number[]>
): SafeToSpendResult {
  const horizonDays = getHorizonDays(tier)
  const currentBalance =
    balance.checking_cents + (includeSavings ? balance.savings_cents : 0)
  const buffer = profile.buffer_cents

  const events = generateForecastEvents(
    anchors,
    new Date(),
    horizonDays,
    historicalAmounts
  )

  const dailyForecasts = generateDailyForecasts(
    currentBalance,
    buffer,
    events,
    horizonDays
  )

  // Find next income event
  const nextIncomeEvent = events.find((e) => e.type === 'income')
  const daysUntilIncome = nextIncomeEvent
    ? differenceInDays(nextIncomeEvent.date, new Date())
    : horizonDays

  // Calculate bills and income until next income
  const eventsUntilIncome = events.filter(
    (e) =>
      differenceInDays(e.date, new Date()) <=
      Math.max(daysUntilIncome, 7)
  )

  const upcomingBills = eventsUntilIncome
    .filter((e) => e.type === 'bill' && e.is_required)
    .reduce((sum, e) => sum + Math.abs(e.amount_cents), 0)

  const expectedIncome = eventsUntilIncome
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount_cents, 0)

  // Calculate spendable amount
  const windowDays = Math.max(daysUntilIncome, 7)
  const spendable = Math.max(
    0,
    currentBalance + expectedIncome - upcomingBills - buffer
  )
  const dailySafe = Math.floor(spendable / windowDays)
  const weeklySafe = Math.floor(dailySafe * 7)

  // Update safe_to_spend in daily forecasts
  for (const forecast of dailyForecasts) {
    const daysFromNow = differenceInDays(forecast.date, new Date())
    forecast.safe_to_spend_cents = Math.max(0, dailySafe * (windowDays - daysFromNow))
  }

  // Find risk days (projected balance < 0 or < buffer)
  const riskDays = dailyForecasts.filter((f) => f.risk_level !== 'none')

  // Generate income gap warning if applicable
  let incomeGapWarning: string | null = null
  if (nextIncomeEvent && historicalAmounts?.has(nextIncomeEvent.anchor_id)) {
    const amounts = historicalAmounts.get(nextIncomeEvent.anchor_id)!
    const lowEstimate = calculatePercentile(amounts, 25)
    const minBalance = Math.min(...dailyForecasts.map((f) => f.projected_balance_cents))

    if (lowEstimate < nextIncomeEvent.amount_cents) {
      const shortfall = nextIncomeEvent.amount_cents - lowEstimate
      const worstCaseBalance = minBalance - shortfall

      if (worstCaseBalance < buffer) {
        const riskDate = riskDays[0]?.date || nextIncomeEvent.date
        incomeGapWarning = `If your next ${nextIncomeEvent.name} is under ${formatCents(lowEstimate)}, you may be short around ${format(riskDate, 'MMM d')}`
      }
    }
  }

  return {
    today: dailySafe,
    thisWeek: weeklySafe,
    currentBalance,
    upcomingBills,
    expectedIncome,
    buffer,
    riskDays,
    dailyForecasts,
    incomeGapWarning,
  }
}

// Helper to format cents as currency string
function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

// Generate mitigation suggestions when risk is detected
export function generateMitigationSuggestions(
  result: SafeToSpendResult,
  anchors: Anchor[]
): string[] {
  const suggestions: string[] = []

  if (result.riskDays.length === 0) return suggestions

  // Suggestion 1: Reduce daily spending
  const reducedDaily = Math.max(0, result.today - Math.floor(result.today * 0.2))
  if (reducedDaily < result.today) {
    suggestions.push(
      `Reduce daily spending to ${formatCents(reducedDaily)} to build a safety margin`
    )
  }

  // Suggestion 2: Identify optional bills that could be delayed
  const optionalBills = anchors.filter(
    (a) => a.type === 'bill' && !a.required && a.confirmed
  )
  if (optionalBills.length > 0) {
    const optionalTotal = optionalBills.reduce(
      (sum, a) => sum + Math.abs(a.amount_min_cents),
      0
    )
    suggestions.push(
      `Consider delaying ${optionalBills.length} optional payment(s) totaling ${formatCents(optionalTotal)}`
    )
  }

  // Suggestion 3: Increase buffer or move from savings
  if (result.buffer > 0) {
    suggestions.push(
      `Review your ${formatCents(result.buffer)} buffer amount - you may need to adjust it based on your situation`
    )
  }

  return suggestions.slice(0, 3) // Return max 3 suggestions
}

// Convert SafeToSpendResult to Forecast records for DB storage
export function toForecastRecords(
  userId: string,
  result: SafeToSpendResult
): Omit<Forecast, 'id' | 'created_at'>[] {
  return result.dailyForecasts.map((daily) => ({
    user_id: userId,
    forecast_date: format(daily.date, 'yyyy-MM-dd'),
    projected_balance_cents: daily.projected_balance_cents,
    safe_to_spend_cents: daily.safe_to_spend_cents,
    risk_level: daily.risk_level,
    explanation: {
      events: daily.events.map((e) => ({
        type: e.type,
        name: e.name,
        amount: e.amount_cents,
      })),
    },
  }))
}
