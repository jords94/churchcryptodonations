/**
 * MoonPay Withdraw (Offramp) Page
 *
 * Allows users to sell cryptocurrency and receive fiat currency.
 * For example, convert BTC or USDC to USD and transfer to bank account.
 *
 * Features:
 * - Select wallet to withdraw from
 * - Enter amount to withdraw
 * - Select fiat currency (USD, EUR, etc.)
 * - Open MoonPay offramp widget
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
import { CHAIN_CONFIG } from '@/config/chains';
import { getMoonPaySellUrl, isMoonPayConfigured, MOONPAY_CONFIG } from '@/config/moonpay';
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
 * Withdraw page
 */
export default function WithdrawPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, church, isLoading: isAuthLoading } = useAuth();

  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [fiatCurrency, setFiatCurrency] = useState<string>('USD');
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
    }
  }, [selectedWalletId, wallets]);

  /**
   * Handle withdraw button click
   */
  const handleWithdraw = () => {
    if (!selectedWallet) return;

    const currencyCode = selectedWallet.chain.toLowerCase();

    // Generate MoonPay sell/offramp URL
    const sellUrl = getMoonPaySellUrl({
      walletAddress: selectedWallet.address,
      currencyCode,
      baseCurrencyAmount: amount ? parseFloat(amount) : undefined,
      refundWalletAddress: selectedWallet.address,
    });

    // Open in new tab
    window.open(sellUrl, '_blank', 'width=500,height=700');
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
              You need to create a wallet before withdrawing funds
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
            <strong>MVP Mode:</strong> MoonPay is not configured yet. The withdraw will work once you add your MoonPay API keys to the environment variables.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Withdraw to Bank Account</CardTitle>
          <CardDescription>
            Convert cryptocurrency to fiat currency using MoonPay
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Select Wallet */}
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
                    {config.icon} {wallet.label || `${config.name} Wallet`} - {wallet.balanceCrypto} {config.name}
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
              placeholder={`Enter amount in ${chainConfig?.name || ''}`}
            />
            <p className="text-xs text-gray-500">
              Leave blank to specify amount in MoonPay widget
            </p>
          </div>

          {/* Fiat Currency */}
          <div className="space-y-2">
            <Label htmlFor="fiatCurrency">Receive Currency</Label>
            <select
              id="fiatCurrency"
              value={fiatCurrency}
              onChange={(e) => setFiatCurrency(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {MOONPAY_CONFIG.fiatCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          {/* Wallet Info */}
          {selectedWallet && chainConfig && (
            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{chainConfig.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold">{chainConfig.fullName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Available: {selectedWallet.balanceCrypto} {chainConfig.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    ≈ ${parseFloat(selectedWallet.balanceUsd).toFixed(2)} {fiatCurrency}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fee Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Fee Information</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Estimated offramp fee: ~{MOONPAY_CONFIG.estimatedFees.offramp}%</li>
              <li>• Bank transfer fees may apply</li>
              <li>• Exact rate shown in MoonPay widget</li>
              <li>• Typically takes 1-3 business days</li>
            </ul>
          </div>

          {/* KYC Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Identity Verification Required</h4>
            <p className="text-sm text-yellow-800">
              To comply with financial regulations, you'll need to complete identity verification (KYC) in MoonPay before withdrawing funds to your bank account.
            </p>
          </div>

          {/* Withdraw Button */}
          <Button
            onClick={handleWithdraw}
            disabled={!selectedWallet}
            className="w-full"
            size="lg"
          >
            Open MoonPay Withdraw
          </Button>

          {/* Instructions */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">How It Works</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Click "Open MoonPay Withdraw" to open the widget</li>
              <li>Complete identity verification (if first time)</li>
              <li>Add your bank account details</li>
              <li>Review the exchange rate and fees</li>
              <li>Confirm the withdrawal</li>
              <li>Funds arrive in your bank in 1-3 business days</li>
            </ol>
          </div>

          {/* Supported Payment Methods */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Withdrawal Methods</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div>🏦 Bank Transfer (ACH, SEPA)</div>
              <div>💳 Debit Card</div>
              <div>📱 PayPal (select regions)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
