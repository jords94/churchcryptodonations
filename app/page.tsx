/**
 * ═══════════════════════════════════════════════════════════════════════
 * HOME PAGE COMPONENT - Landing Page for Church Crypto Donations Platform
 * ═══════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS FILE DOES:
 * This is the main landing page that visitors see when they first visit the website.
 * Think of it as the "front door" of our application.
 *
 * MAIN FEATURES DISPLAYED:
 * 1. Platform title and branding
 * 2. Three feature cards explaining what the platform offers
 * 3. Status message showing the platform is in development
 *
 * WHY WE NEED THIS:
 * - First impressions matter! This page helps visitors understand what we offer
 * - It introduces the key benefits of using crypto for church donations
 * - Serves as entry point before users sign up or log in
 *
 * FOR BEGINNERS:
 * - A "component" in React is like a reusable building block for your website
 * - This is a "function component" - it's literally a JavaScript function that returns HTML
 * - The HTML-like syntax is called JSX (JavaScript XML)
 * - "export default" makes this available to be imported by other files
 *
 * TODO FOR FUTURE:
 * - Add marketing content to explain benefits in detail
 * - Add feature highlights with screenshots/videos
 * - Add pricing tiers (Free, Pro, Enterprise)
 * - Add testimonials from churches already using the platform
 * - Add call-to-action buttons (Sign Up, Schedule Demo)
 */

// "export default" makes this function available to other files
// "function Home()" defines a React component named Home
export default function Home() {
  // The "return" statement outputs the HTML/JSX that will be displayed on the page
  return (
    // <main> is the main content area of the page
    // className applies Tailwind CSS styles:
    // - "flex" arranges items in a flexible layout
    // - "min-h-screen" makes it at least as tall as the browser window
    // - "flex-col" stacks items vertically
    // - "items-center" centers items horizontally
    // - "justify-between" spaces items evenly
    // - "p-24" adds padding of 24 units around all sides
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* This div is the container for all content */}
      {/* "z-10" controls stacking order (higher numbers appear on top) */}
      {/* "max-w-5xl" limits maximum width for readability */}
      {/* "w-full" makes it take full width up to the max */}
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">

        {/* SECTION 1: Main Heading */}
        {/* This is the large title users see first */}
        <h1 className="text-4xl font-bold text-center mb-8">
          Church Crypto Donations
        </h1>

        {/* SECTION 2: Feature Cards Grid */}
        {/* This creates a responsive grid of 3 feature cards */}
        {/* WHY: We want to quickly show visitors the top 3 benefits */}
        {/* "grid" creates a grid layout */}
        {/* "lg:grid-cols-3" means on large screens, show 3 columns */}
        {/* On smaller screens, it automatically stacks vertically */}
        <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left">

          {/* FEATURE CARD 1: Secure Wallets */}
          {/* "group" allows hover effects to affect child elements */}
          {/* "hover:border-gray-300" changes border color on mouse hover */}
          {/* WHY: Interactive hover effects make the UI feel more responsive */}
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Secure Wallets
            </h2>
            {/* "opacity-50" makes text slightly transparent for visual hierarchy */}
            {/* "max-w-[30ch]" limits width to 30 characters for readability */}
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Generate secure, non-custodial wallets for Bitcoin, Ethereum, USDC, and XRP
            </p>
          </div>

          {/* FEATURE CARD 2: Easy Donations */}
          {/* Same styling pattern as Card 1 for consistency */}
          {/* WHY: Consistent design helps users know what to expect */}
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Easy Donations
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              QR codes and simple donation pages make giving effortless for your congregation
            </p>
          </div>

          {/* FEATURE CARD 3: Real-time Tracking */}
          {/* This card highlights the analytics capabilities */}
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              Real-time Tracking
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Monitor donations in real-time with automatic USD conversion and analytics
            </p>
          </div>
        </div>

        {/* SECTION 3: Status Message */}
        {/* This informs visitors about the current state of the platform */}
        {/* "mt-16" adds margin-top for spacing from above content */}
        <div className="mt-16 text-center">
          {/* Main status message */}
          <p className="text-lg text-gray-600 mb-4">
            Platform setup in progress...
          </p>
          {/* Additional details about supported currencies and features */}
          {/* The "|" character is used as a visual separator */}
          <p className="text-sm text-gray-500">
            Accepting BTC, ETH, USDC, and XRP | Powered by MoonPay | Enterprise-grade security
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONCEPTS FOR BEGINNERS TO UNDERSTAND THIS FILE:
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 1. REACT COMPONENTS:
 *    - Components are reusable pieces of UI
 *    - They're just JavaScript functions that return JSX (HTML-like code)
 *    - You can use components inside other components
 *
 * 2. JSX (JavaScript XML):
 *    - Looks like HTML but it's actually JavaScript
 *    - Allows you to write UI code that's easy to read and maintain
 *    - Anything in curly braces {} is JavaScript code
 *
 * 3. TAILWIND CSS CLASSES:
 *    - Instead of writing CSS in separate files, we use utility classes
 *    - "text-4xl" = very large text
 *    - "font-bold" = bold font weight
 *    - "mb-8" = margin-bottom of 8 units
 *    - "hover:bg-gray-100" = changes background to gray when you hover with mouse
 *
 * 4. RESPONSIVE DESIGN:
 *    - "lg:" prefix means "on large screens"
 *    - Without prefix, styles apply to all screen sizes
 *    - This makes the page look good on phones, tablets, and desktops
 *
 * 5. FILE LOCATION:
 *    - This file is in /app/page.tsx
 *    - In Next.js, files in the /app folder automatically become pages
 *    - page.tsx specifically becomes the homepage (/)
 *
 * 6. WHY THIS STRUCTURE:
 *    - Clean, simple design puts focus on the message
 *    - Three feature cards are easy to scan quickly
 *    - Responsive grid works on any device
 *    - Hover effects provide visual feedback to users
 */
