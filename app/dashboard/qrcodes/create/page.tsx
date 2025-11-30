/**
 * Create QR Code Page
 *
 * Page for creating new donation QR codes.
 *
 * Features:
 * - Select wallet
 * - Configure campaign details
 * - Customize QR code appearance
 * - Preview QR code
 * - Save and get shareable link
 *
 * Uses the QRCodeCustomizer component.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QRCodeCustomizer, type QRCodeConfig } from '@/components/qrcode/QRCodeCustomizer';
import type { Chain } from '@/config/chains';

/**
 * Wallet option for selection
 */
interface WalletOption {
  id: string;
  address: string;
  chain: Chain;
  label: string | null;
}

/**
 * Create QR code page component
 */
export default function CreateQRCodePage() {
  const router = useRouter();

  // TODO: Get from auth context
  const churchId = 'temp-church-id';
  const churchName = 'Sample Church'; // TODO: Get from API
  const churchLogoUrl = undefined; // TODO: Get from API

  // State
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [error, setError] = useState<string>('');

  /**
   * Fetch wallets on mount
   */
  useEffect(() => {
    fetchWallets();
  }, []);

  /**
   * Fetch available wallets from API
   */
  const fetchWallets = async () => {
    setIsLoadingWallets(true);
    setError('');

    try {
      const response = await fetch(`/api/wallets?churchId=${churchId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }

      const data = await response.json();
      setWallets(data.wallets || []);

      if (data.wallets.length === 0) {
        setError('No wallets found. Please create a wallet first.');
      }
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
      setError('Failed to load wallets. Please try again.');
    } finally {
      setIsLoadingWallets(false);
    }
  };

  /**
   * Handle save QR code configuration
   */
  const handleSave = async (config: QRCodeConfig) => {
    try {
      const response = await fetch('/api/qrcodes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          churchId,
          walletId: config.walletId,
          campaignName: config.campaignName,
          suggestedAmount: config.suggestedAmount,
          customMessage: config.customMessage,
          foregroundColor: config.foregroundColor,
          backgroundColor: config.backgroundColor,
          includeLogo: config.includeLogo,
          errorCorrectionLevel: config.errorCorrectionLevel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create QR code');
      }

      const data = await response.json();

      // Redirect to QR code details or list
      router.push(`/dashboard/qrcodes?created=${data.qrCode.id}`);
    } catch (error) {
      console.error('Failed to save QR code:', error);
      throw error; // Let QRCodeCustomizer handle the error display
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/dashboard/qrcodes">
            <Button variant="ghost" size="sm">
              ← Back to QR Codes
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Create QR Code</h1>
        <p className="text-gray-600">
          Design a custom QR code for your donation campaign
        </p>
      </div>

      {/* Error State */}
      {error && !isLoadingWallets && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 mb-4">{error}</p>
              {wallets.length === 0 && (
                <Button asChild>
                  <Link href="/dashboard/wallets/create">
                    Create Your First Wallet
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingWallets && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading wallets...</p>
        </div>
      )}

      {/* QR Code Customizer */}
      {!isLoadingWallets && wallets.length > 0 && (
        <QRCodeCustomizer
          wallets={wallets}
          churchName={churchName}
          churchLogoUrl={churchLogoUrl}
          onSave={handleSave}
        />
      )}

      {/* Help Section */}
      {!isLoadingWallets && wallets.length > 0 && (
        <Card className="mt-8">
          <CardContent className="py-6">
            <h3 className="font-semibold mb-3">💡 Tips for Effective QR Codes:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <strong>Campaign Name:</strong> Use clear, specific names like "Sunday Offerings"
                or "Building Fund 2024"
              </li>
              <li>
                <strong>Suggested Amount:</strong> Set a suggested amount to make it easier for
                donors (they can still change it)
              </li>
              <li>
                <strong>Custom Message:</strong> Add a personal message to encourage giving
              </li>
              <li>
                <strong>Colors:</strong> Use your church's brand colors for consistency
              </li>
              <li>
                <strong>Logo:</strong> Including your logo increases trust and recognition (requires
                high error correction)
              </li>
              <li>
                <strong>Print Quality:</strong> For physical printing, download the high-resolution
                version
              </li>
              <li>
                <strong>Multiple QR Codes:</strong> Create different QR codes for different
                campaigns to track donations
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
