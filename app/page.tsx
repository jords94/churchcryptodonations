/**
 * Home page component
 *
 * This is the main landing page for the Church Crypto Donations platform
 * It serves as the entry point for new visitors and provides:
 * - Overview of the platform's features
 * - Call-to-action to sign up or learn more
 * - Trust indicators (security, ease of use, support)
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Church Crypto Donations
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Accept Crypto Donations
            <br />
            <span className="text-blue-600">Simplified for Churches</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Generate secure wallets, create QR codes, and track donations in real-time.
            No crypto experience required.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              Create Free Account
            </Link>
            <Link
              href="/auth/login"
              className="bg-white text-gray-900 hover:bg-gray-50 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-gray-200 transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            ✨ MVP Version - BTC + USDC Support
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Secure Wallets
            </h3>
            <p className="text-gray-600">
              Generate non-custodial HD wallets for Bitcoin and USDC. Your keys, your crypto.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              QR Code Donations
            </h3>
            <p className="text-gray-600">
              Beautiful donation pages with QR codes. Perfect for bulletins and displays.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Easy Management
            </h3>
            <p className="text-gray-600">
              Track all donations in one dashboard. Multiple users with role-based access.
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-blue-900 font-semibold mb-2">
            🚀 MVP Development Version
          </p>
          <p className="text-blue-700 text-sm">
            Currently supporting: <strong>Bitcoin (BTC)</strong> and <strong>USD Coin (USDC)</strong>
          </p>
          <p className="text-blue-600 text-xs mt-2">
            ETH and XRP support coming soon
          </p>
        </div>

        {/* Quick Start */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Get Started in 2 Minutes
          </h3>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center max-w-4xl mx-auto">
            <div className="flex-1 text-left">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Sign Up</h4>
                  <p className="text-sm text-gray-600">Create your account and church profile</p>
                </div>
              </div>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Generate Wallet</h4>
                  <p className="text-sm text-gray-600">Create secure BTC or USDC wallet</p>
                </div>
              </div>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Share QR Code</h4>
                  <p className="text-sm text-gray-600">Start accepting donations immediately</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <Link
              href="/auth/signup"
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              Start Now →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              🔒 Non-custodial • ⚡ Real-time • 🌍 Blockchain-powered
            </p>
            <p className="mt-2">
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                Create Account
              </Link>
              {' • '}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
