import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// This endpoint initializes the database schema
// It should only be called once during setup
// Protected by a secret key in the query string

export async function POST(request: NextRequest) {
  // Simple protection - require a setup key
  const { searchParams } = new URL(request.url)
  const setupKey = searchParams.get('key')

  if (setupKey !== 'init-budget-analyzer-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: { step: string; success: boolean; error?: string }[] = []

  try {
    // Create custom types using raw SQL via rpc if available
    // For now, we'll create tables that work without custom enums

    // Check if profiles table exists by trying to select from it
    const { error: checkError } = await supabase.from('profiles').select('user_id').limit(1)

    if (checkError?.code === '42P01') {
      // Table doesn't exist - need to run schema
      // Since we can't run raw SQL via the REST API,
      // we need to return instructions
      return NextResponse.json({
        status: 'schema_needed',
        message: 'Database tables do not exist. Please run the schema.sql file in your Supabase SQL editor.',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        instructions: [
          '1. Open your Supabase Dashboard',
          '2. Go to SQL Editor',
          '3. Paste the contents of supabase/schema.sql',
          '4. Click Run'
        ]
      })
    }

    if (checkError) {
      results.push({ step: 'check_profiles', success: false, error: checkError.message })
    } else {
      results.push({ step: 'check_profiles', success: true })
    }

    // Check other tables
    const tables = ['manual_balances', 'transactions', 'anchors', 'forecasts', 'subscriptions']

    for (const table of tables) {
      const { error } = await (supabase.from(table) as any).select('*').limit(1)
      if (error?.code === '42P01') {
        results.push({ step: `check_${table}`, success: false, error: 'Table does not exist' })
      } else if (error) {
        results.push({ step: `check_${table}`, success: false, error: error.message })
      } else {
        results.push({ step: `check_${table}`, success: true })
      }
    }

    const allTablesExist = results.every(r => r.success)

    return NextResponse.json({
      status: allTablesExist ? 'ready' : 'incomplete',
      message: allTablesExist
        ? 'All database tables are set up correctly!'
        : 'Some tables are missing. Please run the schema.sql file.',
      results
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
