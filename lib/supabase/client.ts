import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Use placeholder values during build time when env vars aren't available
// The real values will be used at runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
