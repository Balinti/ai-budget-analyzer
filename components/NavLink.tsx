'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  mobile?: boolean
}

export function NavLink({ href, children, mobile }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/app' && pathname.startsWith(href))

  if (mobile) {
    return (
      <Link
        href={href}
        className={clsx(
          'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
          isActive
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        )}
      >
        {children}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={clsx(
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      )}
    >
      {children}
    </Link>
  )
}
