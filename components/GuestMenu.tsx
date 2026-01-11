'use client'

import Link from 'next/link'

export function GuestMenu() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Create Account
      </Link>
    </div>
  )
}
