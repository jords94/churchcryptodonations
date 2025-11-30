/**
 * Donation Thank You Page
 *
 * Confirmation page shown after donor indicates they've sent a donation.
 *
 * Route: /donate/[qrCodeId]/thank-you
 *
 * Features:
 * - Thank you message
 * - Transaction tracking instructions
 * - Church contact information
 * - Share donation page
 * - Optional email collection for receipt
 *
 * This page helps track donation funnel completion.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { CHAIN_CONFIG } from '@/config/chains';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Page props
 */
interface ThankYouPageProps {
  params: {
    qrCodeId: string;
  };
}

/**
 * Get QR code data
 */
async function getQRCodeData(qrCodeId: string) {
  try {
    const qrCode = await prisma.qRCode.findUnique({
      where: {
        id: qrCodeId,
        isActive: true,
      },
      select: {
        id: true,
        campaignName: true,
        wallet: {
          select: {
            address: true,
            chain: true,
            church: {
              select: {
                name: true,
                logoUrl: true,
                websiteUrl: true,
                contactEmail: true,
              },
            },
          },
        },
      },
    });

    if (!qrCode) {
      return null;
    }

    // Increment donations count (fire-and-forget)
    prisma.qRCode
      .update({
        where: { id: qrCodeId },
        data: { donations: { increment: 1 } },
      })
      .catch((error) => {
        console.error('Failed to increment donations count:', error);
      });

    return qrCode;
  } catch (error) {
    console.error('Failed to fetch QR code:', error);
    return null;
  }
}

/**
 * Thank you page component
 */
export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const qrCodeData = await getQRCodeData(params.qrCodeId);

  if (!qrCodeData) {
    notFound();
  }

  const { wallet, campaignName } = qrCodeData;
  const church = wallet.church;
  const chainConfig = CHAIN_CONFIG[wallet.chain];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-12">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <div className="text-5xl">✓</div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Thank You for Your Donation!</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your generous support of {church.name} is greatly appreciated.
          </p>
        </div>

        {/* What's Next */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
            <CardDescription>Here's what to expect with your donation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Transaction Confirmation</h3>
                <p className="text-sm text-gray-600">
                  Your transaction is being confirmed on the {chainConfig.fullName} blockchain. This
                  typically takes {Math.round(chainConfig.blockTime * chainConfig.confirmations / 60)}{' '}
                  minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Church Receives Donation</h3>
                <p className="text-sm text-gray-600">
                  Once confirmed, your donation will appear in {church.name}'s wallet. The church
                  receives real-time notifications of all donations.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Track Your Donation</h3>
                <p className="text-sm text-gray-600 mb-2">
                  You can view your transaction on the blockchain explorer at any time:
                </p>
                <a
                  href={`${chainConfig.blockExplorer}/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-semibold"
                >
                  View on {chainConfig.name} Explorer →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Donation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Campaign</div>
                <div className="font-semibold">{campaignName}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Cryptocurrency</div>
                <div className="font-semibold flex items-center gap-2">
                  <span>{chainConfig.icon}</span>
                  <span>{chainConfig.fullName}</span>
                </div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Wallet Address</div>
                <div className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                  {wallet.address}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {church.contactEmail && (
                <div>
                  <div className="text-gray-600 mb-1">Contact {church.name}</div>
                  <a
                    href={`mailto:${church.contactEmail}`}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    {church.contactEmail}
                  </a>
                </div>
              )}
              <div>
                <div className="text-gray-600 mb-1">Tax Information</div>
                <p>
                  Cryptocurrency donations may be tax-deductible. Please consult with a tax
                  professional for guidance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href={`/donate/${params.qrCodeId}`}>← Back to Donation Page</Link>
          </Button>
          {church.websiteUrl && (
            <Button asChild size="lg">
              <a href={church.websiteUrl} target="_blank" rel="noopener noreferrer">
                Visit {church.name} →
              </a>
            </Button>
          )}
        </div>

        {/* Social Sharing */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Help spread the word:</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/donate/${params.qrCodeId}`;
                const text = `Support ${church.name} - ${campaignName} with cryptocurrency donations`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                  '_blank'
                );
              }}
            >
              Share on Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/donate/${params.qrCodeId}`;
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                  '_blank'
                );
              }}
            >
              Share on Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const url = `${window.location.origin}/donate/${params.qrCodeId}`;
                try {
                  await navigator.clipboard.writeText(url);
                  alert('Link copied to clipboard!');
                } catch (error) {
                  console.error('Copy failed:', error);
                }
              }}
            >
              Copy Link
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-gray-50 border-t border-gray-200">
        <div className="container max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>May God bless your generosity</p>
          <p className="mt-2 text-xs">
            Powered by ChurchCrypto • Secure Cryptocurrency Donations for Churches
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Generate metadata
 */
export async function generateMetadata({ params }: ThankYouPageProps) {
  const qrCodeData = await getQRCodeData(params.qrCodeId);

  if (!qrCodeData) {
    return {
      title: 'Thank You',
    };
  }

  return {
    title: `Thank You - ${qrCodeData.wallet.church.name}`,
    description: `Thank you for your donation to ${qrCodeData.wallet.church.name}`,
  };
}
