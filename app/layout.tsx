import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Budget Analyzer - Safe-to-Spend Cash Flow Copilot',
  description: 'A Safe-to-Spend cash-flow copilot for irregular-income workers that forecasts upcoming bills/income and tells you how much you can safely spend today.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
