import Link from 'next/link'

const PLUS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
const HAS_PRICING = !!(PLUS_PRICE_ID || PRO_PRICE_ID)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">$</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              AI Budget Analyzer
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Know What You Can
          <span className="text-primary-600"> Safely Spend</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
          A cash-flow copilot for irregular-income workers. Forecast your bills and income,
          and never wonder again if you can afford that purchase.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/signup" className="btn-primary text-lg px-8 py-3">
            Start Free
          </Link>
          <a href="#features" className="btn-secondary text-lg px-8 py-3">
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Everything you need to manage irregular income
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Safe-to-Spend Calculator
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Know exactly how much you can spend today and this week without missing bills.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Bill & Income Forecasting
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Automatically detect recurring bills and income. See your cash flow projected into the future.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Risk Warnings
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get early warnings when upcoming bills might put you in the red. Plan ahead.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              CSV Import
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Import your bank transactions via CSV. No need for complex bank connections.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Smart Detection
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              We automatically find recurring patterns in your transactions and suggest bills to track.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Privacy First
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Your data stays yours. No selling, no sharing. Only what&apos;s needed to help you.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section - Only show if price IDs are configured */}
      {HAS_PRICING && (
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Start free and upgrade when you need more. No hidden fees.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Free</h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                $0<span className="text-lg font-normal text-gray-500">/mo</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  7-day forecast
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Up to 5 bills/income
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  CSV import
                </li>
              </ul>
              <Link href="/signup" className="btn-secondary w-full">
                Get Started
              </Link>
            </div>

            {/* Plus Tier */}
            {PLUS_PRICE_ID && (
              <div className="card p-6 border-2 border-primary-600 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-sm px-3 py-1 rounded-full">Popular</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Plus</h3>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  $5<span className="text-lg font-normal text-gray-500">/mo</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    30-day forecast
                  </li>
                  <li className="flex items-center text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Up to 20 bills/income
                  </li>
                  <li className="flex items-center text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Income gap warnings
                  </li>
                </ul>
                <Link href="/signup" className="btn-primary w-full">
                  Start Free Trial
                </Link>
              </div>
            )}

            {/* Pro Tier */}
            {PRO_PRICE_ID && (
              <div className="card p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Pro</h3>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  $12<span className="text-lg font-normal text-gray-500">/mo</span>
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    60-day forecast
                  </li>
                  <li className="flex items-center text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Unlimited bills/income
                  </li>
                  <li className="flex items-center text-gray-600 dark:text-gray-300">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Multiple budget plans
                  </li>
                </ul>
                <Link href="/signup" className="btn-secondary w-full">
                  Start Free Trial
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="card p-12 text-center bg-primary-600">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to take control of your finances?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of freelancers, gig workers, and anyone with irregular income
            who now know exactly what they can spend.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-primary-50 transition-colors"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                AI Budget Analyzer
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} AI Budget Analyzer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
