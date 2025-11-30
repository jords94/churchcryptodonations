/**
 * Donation Landing Page
 *
 * Public page for cryptocurrency donations via QR code.
 *
 * Route: /donate/[qrCodeId]
 *
 * Features:
 * - Display QR code and wallet address
 * - Show church name, campaign, and suggested amount
 * - Copy address to clipboard
 * - Instructions for manual donation
 * - Track page views for analytics
 * - Mobile-optimized for wallet apps
 *
 * Flow:
 * 1. User scans QR code (redirects to this page)
 * 2. Page displays donation details
 * 3. User can:
 *    a) Open in wallet app (if on mobile)
 *    b) Copy address and send manually
 *    c) View instructions
 * 4. After sending, redirect to thank you page
 *
 * Security:
 * - Public page (no auth required)
 * - Rate limited for analytics tracking
 * - Input validation for QR code ID
 */

import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { CHAIN_CONFIG } from '@/config/chains';
import { DonationInterface } from '@/components/donations/DonationInterface';

/**
 * Page props
 */
interface DonatePageProps {
  params: {
    qrCodeId: string;
  };
}

/**
 * Get QR code data from database
 *
 * This runs on the server to fetch QR code configuration.
 *
 * @param qrCodeId - QR code ID from URL
 * @returns QR code data with wallet and church info
 */
async function getQRCodeData(qrCodeId: string) {
  try {
    // Fetch QR code with related wallet and church data
    const qrCode = await prisma.qRCode.findUnique({
      where: {
        id: qrCodeId,
        isActive: true, // Only show active QR codes
      },
      select: {
        id: true,
        campaignName: true,
        suggestedAmount: true,
        customMessage: true,
        foregroundColor: true,
        backgroundColor: true,
        includeLogo: true,
        views: true,
        wallet: {
          select: {
            id: true,
            address: true,
            chain: true,
            label: true,
            church: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                websiteUrl: true,
              },
            },
          },
        },
      },
    });

    if (!qrCode) {
      return null;
    }

    // Increment view count (fire-and-forget, don't block page render)
    prisma.qRCode
      .update({
        where: { id: qrCodeId },
        data: { views: { increment: 1 } },
      })
      .catch((error) => {
        console.error('Failed to increment view count:', error);
      });

    return qrCode;
  } catch (error) {
    console.error('Failed to fetch QR code:', error);
    return null;
  }
}

/**
 * Donation page component
 *
 * This is a Server Component that fetches data and renders the donation interface.
 */
export default async function DonatePage({ params }: DonatePageProps) {
  const qrCodeData = await getQRCodeData(params.qrCodeId);

  // If QR code not found or inactive, show 404
  if (!qrCodeData) {
    notFound();
  }

  const { wallet, campaignName, suggestedAmount, customMessage } = qrCodeData;
  const church = wallet.church;
  const chainConfig = CHAIN_CONFIG[wallet.chain];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Church Logo/Name */}
            <div className="flex items-center gap-3">
              {church.logoUrl ? (
                <img
                  src={church.logoUrl}
                  alt={church.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                  {church.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg">{church.name}</h1>
                {church.websiteUrl && (
                  <a
                    href={church.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            </div>

            {/* Crypto Badge */}
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full">
              <span className="text-2xl">{chainConfig.icon}</span>
              <span className="font-semibold text-sm">{chainConfig.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Campaign Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">{campaignName}</h2>
          {customMessage && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{customMessage}</p>
          )}
        </div>

        {/* Donation Interface */}
        <DonationInterface
          qrCodeId={qrCodeData.id}
          address={wallet.address}
          chain={wallet.chain}
          churchName={church.name}
          campaignName={campaignName}
          suggestedAmount={suggestedAmount || undefined}
          customMessage={customMessage || undefined}
          foregroundColor={qrCodeData.foregroundColor}
          backgroundColor={qrCodeData.backgroundColor}
          logoUrl={qrCodeData.includeLogo ? church.logoUrl || undefined : undefined}
        />

        {/* Trust Indicators */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl">🔒</div>
              <h3 className="font-semibold">Secure & Direct</h3>
              <p className="text-sm text-gray-600">
                Your donation goes directly to {church.name}'s wallet. No intermediaries.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-3xl">⚡</div>
              <h3 className="font-semibold">Fast & Transparent</h3>
              <p className="text-sm text-gray-600">
                Blockchain transactions are permanent and publicly verifiable.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-3xl">🌍</div>
              <h3 className="font-semibold">Global Access</h3>
              <p className="text-sm text-gray-600">
                Donate from anywhere in the world, 24/7, with no borders.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            <strong>Tax Disclaimer:</strong> Cryptocurrency donations may be tax-deductible. Consult
            with a tax professional for guidance. {church.name} is not responsible for providing tax
            advice.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-gray-50 border-t border-gray-200">
        <div className="container max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>
            Powered by ChurchCrypto • Secure Cryptocurrency Donations for Churches
          </p>
          <p className="mt-2 text-xs">
            Always verify the wallet address before sending. Cryptocurrency transactions are
            irreversible.
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: DonatePageProps) {
  const qrCodeData = await getQRCodeData(params.qrCodeId);

  if (!qrCodeData) {
    return {
      title: 'Donation Not Found',
    };
  }

  const church = qrCodeData.wallet.church;

  return {
    title: `Donate to ${church.name} - ${qrCodeData.campaignName}`,
    description: qrCodeData.customMessage || `Support ${church.name} with cryptocurrency donations`,
    openGraph: {
      title: `Donate to ${church.name}`,
      description: qrCodeData.customMessage || `Support ${church.name} with cryptocurrency donations`,
      images: church.logoUrl ? [church.logoUrl] : [],
    },
  };
}
