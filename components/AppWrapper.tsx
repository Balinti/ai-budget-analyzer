'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/lib/hooks/useAuth'
import { hasGuestData, extendGuestSession } from '@/lib/storage/guest-storage'
import { useGuestTimer } from '@/lib/hooks/useGuestTimer'
import { DataMergeDialog } from '@/components/DataMergeDialog'
import { GuestBanner } from '@/components/GuestBanner'
import { GuestExpiredModal } from '@/components/GuestExpiredModal'
import { GuestMenu } from '@/components/GuestMenu'
import { UserMenu } from '@/components/UserMenu'
import { NavLink } from '@/components/NavLink'

function AppContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isGuest, isLoading } = useAuth()
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const { formattedTime, progress, isExpired } = useGuestTimer(isGuest)
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [extendCount, setExtendCount] = useState(0)

  useEffect(() => {
    if (searchParams.get('showMerge') === 'true' && user && hasGuestData()) {
      setShowMergeDialog(true)
    }
  }, [searchParams, user])

  // Show expired modal when timer runs out
  useEffect(() => {
    if (isExpired && isGuest) {
      setShowExpiredModal(true)
    }
  }, [isExpired, isGuest])

  const handleExtend = useCallback(() => {
    if (extendCount >= 2) return // Max 2 extensions
    extendGuestSession()
    setExtendCount((c) => c + 1)
    setShowExpiredModal(false)
  }, [extendCount])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Guest Banner with Timer */}
      {isGuest && <GuestBanner timeRemaining={formattedTime} progress={progress} />}

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
              {user ? <UserMenu email={user.email || ''} /> : <GuestMenu />}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex space-x-1 px-4 py-2">
          <NavLink href="/app" mobile>
            Dashboard
          </NavLink>
          <NavLink href="/app/upload" mobile>
            Import
          </NavLink>
          <NavLink href="/app/anchors" mobile>
            Bills
          </NavLink>
          <NavLink href="/app/forecast" mobile>
            Forecast
          </NavLink>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Merge Dialog */}
      {showMergeDialog && user && (
        <DataMergeDialog
          userId={user.id}
          onComplete={() => {
            setShowMergeDialog(false)
            // Full refresh to reload data
            window.location.href = '/app'
          }}
          onSkip={() => {
            setShowMergeDialog(false)
            window.location.href = '/app'
          }}
        />
      )}

      {/* Guest Expired Modal */}
      {showExpiredModal && isGuest && (
        <GuestExpiredModal onExtend={extendCount < 2 ? handleExtend : undefined} />
      )}
    </div>
  )
}

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        }
      >
        <AppContent>{children}</AppContent>
      </Suspense>
    </AuthProvider>
  )
}
