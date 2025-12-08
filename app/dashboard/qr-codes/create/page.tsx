/**
 * QR Code Generator Page
 *
 * Generates QR codes for wallet addresses to make donations easier.
 *
 * Features:
 * - Select wallet from dropdown
 * - Display QR code for selected wallet
 * - Download QR code as image
 * - Customize QR code size and format
 * - Print-friendly layout
 *
 * MVP: Basic QR code generation with download functionality
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CHAIN_CONFIG } from '@/config/chains';
import type { Chain } from '@/config/chains';

/**
 * Wallet summary
 */
interface WalletSummary {
  id: string;
  chain: Chain;
  label: string | null;
  address: string;
}

/**
 * QR Code generator page
 */
export default function QRCodeGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, church, isLoading: isAuthLoading } = useAuth();

  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const qrRef = useRef<HTMLDivElement>(null);

  /**
   * Fetch wallets
   */
  useEffect(() => {
    const fetchWallets = async () => {
      if (!user || !church) return;

      try {
        setIsLoadingWallets(true);

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/churches/${church.id}/stats`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (response.ok) {
          const data = await response.json();
          setWallets(data.wallets || []);

          // Auto-select wallet from query param
          const walletIdParam = searchParams.get('walletId');
          if (walletIdParam) {
            setSelectedWalletId(walletIdParam);
          } else if (data.wallets.length > 0) {
            setSelectedWalletId(data.wallets[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching wallets:', error);
      } finally {
        setIsLoadingWallets(false);
      }
    };

    if (!isAuthLoading && user && church) {
      fetchWallets();
    }
  }, [user, church, isAuthLoading, searchParams]);

  /**
   * Update selected wallet when selection changes
   */
  useEffect(() => {
    if (selectedWalletId && wallets.length > 0) {
      const wallet = wallets.find(w => w.id === selectedWalletId);
      setSelectedWallet(wallet || null);
    }
  }, [selectedWalletId, wallets]);

  /**
   * Generate QR code when wallet is selected
   */
  useEffect(() => {
    if (selectedWallet) {
      // Use a free QR code API (qrserver.com)
      const address = selectedWallet.address;
      const chainConfig = CHAIN_CONFIG[selectedWallet.chain];

      // Create payment URI for crypto wallets
      // Bitcoin: bitcoin:<address>
      // Ethereum/USDC: ethereum:<address>
      let paymentUri = address;
      if (selectedWallet.chain === 'BTC') {
        paymentUri = `bitcoin:${address}`;
      } else if (selectedWallet.chain === 'USDC' || selectedWallet.chain === 'ETH') {
        paymentUri = `ethereum:${address}`;
      }

      // Generate QR code URL
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(paymentUri)}`;
      setQrCodeUrl(qrUrl);
    }
  }, [selectedWallet]);

  /**
   * Download QR code
   */
  const handleDownload = () => {
    if (!qrCodeUrl || !selectedWallet) return;

    const chainConfig = CHAIN_CONFIG[selectedWallet.chain];
    const label = selectedWallet.label || `${chainConfig.name}-Wallet`;
    const filename = `${label}-QR-Code.png`;

    // Create download link
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Print QR code
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Redirect if not authenticated
   */
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isLoadingWallets) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
              <div className="text-lg font-semibold">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>No Wallets Found</CardTitle>
            <CardDescription>
              You need to create a wallet before generating QR codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/wallets/create')}>
              Create Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chainConfig = selectedWallet ? CHAIN_CONFIG[selectedWallet.chain] : null;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </Button>
        <Button onClick={() => router.push('/dashboard/qr-codes/onramp')}>
          MoonPay Onramp QR Codes →
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generator</CardTitle>
            <CardDescription>
              Generate a QR code for your crypto wallet to make donations easier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Selection */}
            <div className="space-y-2">
              <Label htmlFor="wallet">Select Wallet</Label>
              <select
                id="wallet"
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Choose a wallet</option>
                {wallets.map((wallet) => {
                  const config = CHAIN_CONFIG[wallet.chain];
                  return (
                    <option key={wallet.id} value={wallet.id}>
                      {config.icon} {wallet.label || `${config.name} Wallet`}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedWallet && chainConfig && (
              <>
                {/* Wallet Info */}
                <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Blockchain</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">{chainConfig.icon}</span>
                      <span className="font-semibold">{chainConfig.fullName}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-600">Address</div>
                    <div className="mt-1 font-mono text-sm break-all bg-white p-2 rounded border">
                      {selectedWallet.address}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button onClick={handleDownload} className="w-full">
                    Download QR Code
                  </Button>
                  <Button onClick={handlePrint} variant="outline" className="w-full">
                    Print QR Code
                  </Button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">How to Use</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Download the QR code image</li>
                    <li>• Display it in your church bulletin or website</li>
                    <li>• Donors can scan it with their crypto wallet app</li>
                    <li>• Donations will appear in your wallet</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* QR Code Preview */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>QR Code Preview</CardTitle>
            <CardDescription>
              Scan this code with a crypto wallet app to donate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedWallet && chainConfig && qrCodeUrl ? (
              <div ref={qrRef} className="text-center space-y-4">
                <div className="bg-white p-8 rounded-lg border-2 border-gray-200 inline-block">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${chainConfig.name} donations`}
                    className="w-full max-w-sm mx-auto"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {selectedWallet.label || `${chainConfig.name} Donations`}
                  </div>
                  <div className="text-lg text-gray-600">
                    {chainConfig.fullName}
                  </div>
                  <div className="text-sm text-gray-500 font-mono break-all px-4">
                    {selectedWallet.address}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Scan with your {chainConfig.name} wallet app to donate
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📱</div>
                <p className="text-gray-600">Select a wallet to generate a QR code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
