/**
 * QR Codes Management Page
 *
 * Dashboard page for managing cryptocurrency donation QR codes.
 *
 * Features:
 * - View all QR codes for the church
 * - Create new QR codes
 * - Edit existing QR codes
 * - Deactivate QR codes
 * - View analytics (views, donations)
 * - Copy/share donation URLs
 * - Download QR codes
 *
 * This page allows churches to manage their donation campaigns.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CHAIN_CONFIG } from '@/config/chains';
import type { Chain } from '@/config/chains';

/**
 * QR Code data structure
 */
interface QRCode {
  id: string;
  campaignName: string;
  suggestedAmount: string | null;
  customMessage: string | null;
  foregroundColor: string;
  backgroundColor: string;
  includeLogo: boolean;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  isActive: boolean;
  views: number;
  donations: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  wallet: {
    id: string;
    address: string;
    chain: Chain;
    label: string | null;
  };
}

/**
 * QR Codes management page component
 */
export default function QRCodesPage() {
  const router = useRouter();

  // TODO: Get churchId from auth context
  const churchId = 'temp-church-id';

  // State
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /**
   * Fetch QR codes on mount
   */
  useEffect(() => {
    fetchQRCodes();
  }, [filter]);

  /**
   * Fetch QR codes from API
   */
  const fetchQRCodes = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        churchId,
      });

      if (filter !== 'all') {
        params.append('isActive', filter === 'active' ? 'true' : 'false');
      }

      const response = await fetch(`/api/qrcodes?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch QR codes');
      }

      const data = await response.json();
      setQRCodes(data.qrCodes || []);
    } catch (error) {
      console.error('Failed to fetch QR codes:', error);
      setError('Failed to load QR codes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copy donation URL to clipboard
   */
  const handleCopyUrl = async (qrCode: QRCode) => {
    try {
      await navigator.clipboard.writeText(qrCode.url);
      setCopiedId(qrCode.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy URL');
    }
  };

  /**
   * Deactivate a QR code
   */
  const handleDeactivate = async (qrCodeId: string) => {
    if (!confirm('Are you sure you want to deactivate this QR code? It will no longer accept donations.')) {
      return;
    }

    try {
      const response = await fetch(`/api/qrcodes/${qrCodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate QR code');
      }

      // Refresh list
      fetchQRCodes();
    } catch (error) {
      console.error('Failed to deactivate QR code:', error);
      alert('Failed to deactivate QR code. Please try again.');
    }
  };

  /**
   * Reactivate a QR code
   */
  const handleReactivate = async (qrCodeId: string) => {
    try {
      const response = await fetch(`/api/qrcodes/${qrCodeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate QR code');
      }

      // Refresh list
      fetchQRCodes();
    } catch (error) {
      console.error('Failed to reactivate QR code:', error);
      alert('Failed to reactivate QR code. Please try again.');
    }
  };

  // Filter QR codes
  const filteredQRCodes =
    filter === 'all'
      ? qrCodes
      : qrCodes.filter((qr) => (filter === 'active' ? qr.isActive : !qr.isActive));

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">QR Codes</h1>
          <p className="text-gray-600">
            Manage donation QR codes for your church wallets
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/qrcodes/create">
            Create QR Code
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({qrCodes.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Active ({qrCodes.filter((qr) => qr.isActive).length})
        </Button>
        <Button
          variant={filter === 'inactive' ? 'default' : 'outline'}
          onClick={() => setFilter('inactive')}
        >
          Inactive ({qrCodes.filter((qr) => !qr.isActive).length})
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading QR codes...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredQRCodes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">No QR Codes Yet</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Create your first QR code to start accepting donations.'
                : `No ${filter} QR codes found.`}
            </p>
            {filter === 'all' && (
              <Button asChild>
                <Link href="/dashboard/qrcodes/create">
                  Create Your First QR Code
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Codes Grid */}
      {!isLoading && filteredQRCodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQRCodes.map((qrCode) => (
            <Card
              key={qrCode.id}
              className={`${!qrCode.isActive ? 'opacity-60 border-gray-300' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg">{qrCode.campaignName}</CardTitle>
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      qrCode.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {qrCode.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <CardDescription>
                  {CHAIN_CONFIG[qrCode.wallet.chain].icon}{' '}
                  {qrCode.wallet.label || qrCode.wallet.address.slice(0, 12)}...
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Suggested Amount */}
                {qrCode.suggestedAmount && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Suggested Amount</div>
                    <div className="font-bold text-primary">
                      {qrCode.suggestedAmount}{' '}
                      {qrCode.wallet.chain === 'USDC'
                        ? 'USDC'
                        : CHAIN_CONFIG[qrCode.wallet.chain].name}
                    </div>
                  </div>
                )}

                {/* Analytics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Views</div>
                    <div className="text-2xl font-bold">{qrCode.views}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600 mb-1">Donations</div>
                    <div className="text-2xl font-bold">{qrCode.donations}</div>
                  </div>
                </div>

                {/* Custom Message */}
                {qrCode.customMessage && (
                  <div className="text-sm text-gray-600 italic">
                    "{qrCode.customMessage}"
                  </div>
                )}

                {/* Donation URL */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">Donation URL</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-100 border rounded px-2 py-1 text-xs font-mono truncate">
                      {qrCode.url}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(qrCode)}
                    >
                      {copiedId === qrCode.id ? '✓' : '📋'}
                    </Button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <a href={qrCode.url} target="_blank" rel="noopener noreferrer">
                    Preview
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Link href={`/dashboard/qrcodes/${qrCode.id}/edit`}>
                    Edit
                  </Link>
                </Button>
                {qrCode.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(qrCode.id)}
                    className="flex-1"
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReactivate(qrCode.id)}
                    className="flex-1"
                  >
                    Reactivate
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      {!isLoading && qrCodes.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">About QR Codes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Views:</strong> Number of times someone scanned or visited the donation page
            </p>
            <p>
              <strong>Donations:</strong> Number of people who clicked "I've Sent My Donation"
              (estimated)
            </p>
            <p>
              <strong>Active/Inactive:</strong> Inactive QR codes will show a "Campaign Ended"
              message
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
