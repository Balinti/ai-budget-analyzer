import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'
import { parseISO, isValid, format } from 'date-fns'

interface ParsedRow {
  date: string
  description: string
  amount_cents: number
  account: string | null
  pending: boolean
  error?: string
}

interface ParseResult {
  rows: ParsedRow[]
  errors: { row: number; message: string }[]
  headers: string[]
}

// Attempt to parse various date formats
function parseDate(value: string): Date | null {
  if (!value) return null

  // Try common formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // M/D/YY or M/D/YYYY
  ]

  // Try ISO parse first
  let date = parseISO(value)
  if (isValid(date)) return date

  // Try MM/DD/YYYY
  const parts = value.split(/[\/\-]/)
  if (parts.length === 3) {
    const [month, day, year] = parts
    const fullYear = year.length === 2 ? `20${year}` : year
    date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (isValid(date)) return date
  }

  return null
}

// Parse amount string to cents (negative for expenses)
function parseAmount(value: string): number | null {
  if (!value) return null

  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[$€£,\s]/g, '').trim()

  // Handle parentheses for negative numbers
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')')
  const numStr = isNegative ? cleaned.slice(1, -1) : cleaned

  const num = parseFloat(numStr)
  if (isNaN(num)) return null

  const cents = Math.round(num * 100)
  return isNegative ? -cents : cents
}

// Map common header variations to standard columns
function mapHeader(header: string): string | null {
  const lower = header.toLowerCase().trim()

  // Date columns
  if (['date', 'txn_date', 'transaction_date', 'posted_date', 'trans date'].includes(lower)) {
    return 'date'
  }

  // Description columns
  if (['description', 'desc', 'memo', 'merchant', 'payee', 'name', 'transaction'].includes(lower)) {
    return 'description'
  }

  // Amount columns
  if (['amount', 'amt', 'value', 'sum', 'debit/credit'].includes(lower)) {
    return 'amount'
  }

  // Account columns
  if (['account', 'acct', 'account_name', 'account name'].includes(lower)) {
    return 'account'
  }

  // Pending columns
  if (['pending', 'status', 'cleared'].includes(lower)) {
    return 'pending'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const headerMapping = formData.get('mapping') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const csvText = await file.text()

    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse CSV: ' + parseResult.errors[0]?.message },
        { status: 400 }
      )
    }

    const headers = parseResult.meta.fields || []

    // Auto-detect or use provided mapping
    let mapping: Record<string, string> = {}

    if (headerMapping) {
      mapping = JSON.parse(headerMapping)
    } else {
      // Auto-detect columns
      for (const header of headers) {
        const mapped = mapHeader(header)
        if (mapped) {
          mapping[mapped] = header
        }
      }
    }

    // Validate required columns
    if (!mapping.date || !mapping.description || !mapping.amount) {
      return NextResponse.json({
        headers,
        mapping,
        needsMapping: true,
        message: 'Please map the required columns: date, description, amount',
      })
    }

    // Process rows
    const result: ParseResult = {
      rows: [],
      errors: [],
      headers,
    }

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i] as Record<string, string>

      const dateValue = row[mapping.date]
      const descValue = row[mapping.description]
      const amountValue = row[mapping.amount]
      const accountValue = mapping.account ? row[mapping.account] : null
      const pendingValue = mapping.pending ? row[mapping.pending] : null

      // Parse date
      const date = parseDate(dateValue)
      if (!date) {
        result.errors.push({ row: i + 1, message: `Invalid date: ${dateValue}` })
        continue
      }

      // Parse amount
      const amount = parseAmount(amountValue)
      if (amount === null) {
        result.errors.push({ row: i + 1, message: `Invalid amount: ${amountValue}` })
        continue
      }

      // Validate description
      if (!descValue || descValue.trim().length === 0) {
        result.errors.push({ row: i + 1, message: 'Missing description' })
        continue
      }

      // Parse pending status
      const pending = pendingValue
        ? ['pending', 'true', 'yes', '1'].includes(pendingValue.toLowerCase())
        : false

      result.rows.push({
        date: format(date, 'yyyy-MM-dd'),
        description: descValue.trim(),
        amount_cents: amount,
        account: accountValue?.trim() || null,
        pending,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('CSV parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    )
  }
}
