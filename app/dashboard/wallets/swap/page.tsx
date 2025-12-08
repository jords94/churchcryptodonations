/**
 * MoonPay Swap Page
 *
 * Allows users to swap between different cryptocurrencies using MoonPay.
 * For example, convert BTC to USDC or vice versa.
 *
 * Features:
 * - Select source wallet (what to swap from)
 * - Select target cryptocurrency (what to swap to)
 * - Enter amount to swap
 * - Open MoonPay swap widget in popup/new tab
 * - Shows estimated fees and exchange rate
 *
 * MVP: Opens MoonPay widget with dummy configuration
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CHAIN_CONFIG, SUPPORTED_CHAINS } from '@/config/chains';
import { getMoonPaySwapUrl, isMoonPayConfigured, MOONPAY_CONFIG } from '@/config/moonpay';
import type { Chain } from '@/config/chains';

/**
 * Wallet summary
 */
interface WalletSummary {
  id: string;
  chain: Chain;
  label: string | null;
  address: string;
  balanceCrypto: string;
  balanceUsd: string;
}

/**
 * Swap page
 */
export default function SwapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, church, isLoading: isAuthLoading } = useAuth();

  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
  const [targetChain, setTargetChain] = useState<Chain>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

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

      // Auto-select opposite chain as target
      if (wallet) {
        const oppositeChain = wallet.chain === 'BTC' ? 'USDC' : 'BTC';
        setTargetChain(oppositeChain as Chain);
      }
    }
  }, [selectedWalletId, wallets]);

  /**
   * Handle swap button click
   */
  const handleSwap = () => {
    if (!selectedWallet) return;

    const fromCurrency = selectedWallet.chain.toLowerCase();
    const toCurrency = targetChain.toLowerCase();

    // Generate MoonPay swap URL
    const swapUrl = getMoonPaySwapUrl({
      walletAddress: selectedWallet.address,
      fromCurrency,
      toCurrency,
      amount: amount ? parseFloat(amount) : undefined,
    });

    // Open in new tab
    window.open(swapUrl, '_blank', 'width=500,height=700');
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
              You need to create a wallet before swapping cryptocurrencies
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

  const fromChainConfig = selectedWallet ? CHAIN_CONFIG[selectedWallet.chain] : null;
  const toChainConfig = CHAIN_CONFIG[targetChain];
  const isConfigured = isMoonPayConfigured();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard/wallets')}>
          ← Back to Wallets
        </Button>
      </div>

      {/* MVP Warning */}
      {!isConfigured && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>MVP Mode:</strong> MoonPay is not configured yet. The swap will work once you add your MoonPay API keys to the environment variables.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Swap Cryptocurrency</CardTitle>
          <CardDescription>
            Exchange between different cryptocurrencies using MoonPay
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* From Wallet */}
          <div className="space-y-2">
            <Label htmlFor="fromWallet">From Wallet</Label>
            <select
              id="fromWallet"
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Choose a wallet</option>
              {wallets.map((wallet) => {
                const config = CHAIN_CONFIG[wallet.chain];
                return (
                  <option key={wallet.id} value={wallet.id}>
                    {config.icon} {wallet.label || `${config.name} Wallet`} - {wallet.balanceCrypto} {config.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <Label htmlFor="toCurrency">To Currency</Label>
            <select
              id="toCurrency"
              value={targetChain}
              onChange={(e) => setTargetChain(e.target.value as Chain)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {SUPPORTED_CHAINS.filter(chain => chain !== selectedWallet?.chain).map((chain) => {
                const config = CHAIN_CONFIG[chain];
                return (
                  <option key={chain} value={chain}>
                    {config.icon} {config.fullName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Optional)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount in ${fromChainConfig?.name || ''}`}
            />
            <p className="text-xs text-gray-500">
              Leave blank to specify amount in MoonPay widget
            </p>
          </div>

          {/* Preview */}
          {selectedWallet && fromChainConfig && (
            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{fromChainConfig.icon}</div>
                  <div>
                    <div className="font-semibold">{fromChainConfig.name}</div>
                    <div className="text-sm text-gray-600">
                      Balance: {selectedWallet.balanceCrypto} {fromChainConfig.name}
                    </div>
                  </div>
                </div>

                <div className="text-2xl">→</div>

                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-right">{toChainConfig.name}</div>
                    <div className="text-sm text-gray-600 text-right">
                      {toChainConfig.fullName}
                    </div>
                  </div>
                  <div className="text-4xl">{toChainConfig.icon}</div>
                </div>
              </div>
            </div>
          )}

          {/* Fee Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Fee Information</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Estimated swap fee: ~{MOONPAY_CONFIG.estimatedFees.swap}%</li>
              <li>• Network fees apply (variable)</li>
              <li>• Exact rate shown in MoonPay widget</li>
              <li>• Typically completes in minutes</li>
            </ul>
          </div>

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!selectedWallet}
            className="w-full"
            size="lg"
          >
            Open MoonPay Swap
          </Button>

          {/* Instructions */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">How It Works</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Click "Open MoonPay Swap" to open the widget</li>
              <li>Review the exchange rate and fees</li>
              <li>Confirm the swap transaction</li>
              <li>MoonPay will process the exchange</li>
              <li>New crypto will be sent to your wallet</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
