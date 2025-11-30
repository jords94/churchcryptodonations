/**
 * Home page component
 *
 * This is the main landing page for the Church Crypto Donations platform
 * It serves as the entry point for new visitors and provides:
 * - Overview of the platform's features
 * - Call-to-action to sign up or learn more
 * - Trust indicators (security, ease of use, support)
 *
 * TODO: Add marketing content, feature highlights, and pricing tiers
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Church Crypto Donations
        </h1>

        <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left">
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Secure Wallets
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Generate secure, non-custodial wallets for Bitcoin, Ethereum, USDC, and XRP
            </p>
          </div>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Easy Donations
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              QR codes and simple donation pages make giving effortless for your congregation
            </p>
          </div>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Real-time Tracking
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Monitor donations in real-time with automatic USD conversion and analytics
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 mb-4">
            Platform setup in progress...
          </p>
          <p className="text-sm text-gray-500">
            Accepting BTC, ETH, USDC, and XRP | Powered by MoonPay | Enterprise-grade security
          </p>
        </div>
      </div>
    </main>
  );
}
