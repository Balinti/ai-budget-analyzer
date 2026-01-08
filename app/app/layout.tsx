import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavLink } from '@/components/NavLink'
import { UserMenu } from '@/components/UserMenu'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if onboarding is completed
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/app" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">$</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                  AI Budget
                </span>
              </Link>

              <div className="hidden md:flex ml-10 space-x-1">
                <NavLink href="/app">Dashboard</NavLink>
                <NavLink href="/app/upload">Import</NavLink>
                <NavLink href="/app/anchors">Bills & Income</NavLink>
                <NavLink href="/app/forecast">Forecast</NavLink>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <UserMenu email={user.email || ''} />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex space-x-1 px-4 py-2">
          <NavLink href="/app" mobile>Dashboard</NavLink>
          <NavLink href="/app/upload" mobile>Import</NavLink>
          <NavLink href="/app/anchors" mobile>Bills</NavLink>
          <NavLink href="/app/forecast" mobile>Forecast</NavLink>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
