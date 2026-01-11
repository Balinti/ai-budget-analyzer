'use client'

import Link from 'next/link'

interface GuestExpiredModalProps {
  onExtend?: () => void
}

export function GuestExpiredModal({ onExtend }: GuestExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Trial Time Expired
          </h2>
          <p className="text-gray-600 mb-6">
            Your guest trial has ended. Create a free account to keep your data and continue using the app.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full bg-primary-600 text-white text-center py-2.5 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Create Free Account
          </Link>
          <Link
            href="/login"
            className="block w-full bg-gray-100 text-gray-700 text-center py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Sign In
          </Link>
          {onExtend && (
            <button
              onClick={onExtend}
              className="block w-full text-gray-500 text-center py-2 text-sm hover:text-gray-700 transition-colors"
            >
              Continue for 2 more minutes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
