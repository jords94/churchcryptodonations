/**
 * Send Cryptocurrency Page (Coming Soon)
 *
 * This feature will allow churches to send cryptocurrency from their wallets.
 *
 * Planned features:
 * - Send to any blockchain address
 * - Send via email/phone (non-custodial links)
 * - Batch sending to multiple recipients
 * - Schedule recurring sends
 * - Multi-signature approval workflow
 *
 * MVP Status: Coming Soon
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  balanceCrypto: string;
  balanceUsd: string;
}

/**
 * Send page (coming soon)
 */
export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, church, isLoading: isAuthLoading } = useAuth();

  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSummary | null>(null);
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

  const chainConfig = selectedWallet ? CHAIN_CONFIG[selectedWallet.chain] : null;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard/wallets')}>
          ← Back to Wallets
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-4xl">🚀</span>
            Send Cryptocurrency - Coming Soon
          </CardTitle>
          <CardDescription>
            This feature is currently in development and will be available soon
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Selected Wallet Preview */}
          {selectedWallet && chainConfig && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{chainConfig.icon}</div>
                <div>
                  <div className="font-semibold text-lg">
                    {selectedWallet.label || `${chainConfig.name} Wallet`}
                  </div>
                  <div className="text-sm text-gray-600">
                    Balance: {selectedWallet.balanceCrypto} {chainConfig.name} (${parseFloat(selectedWallet.balanceUsd).toFixed(2)})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coming Soon Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3 text-lg">
              📬 Send Feature Coming Soon
            </h3>
            <p className="text-blue-800 mb-4">
              We're building a secure and easy way for churches to send cryptocurrency. This feature will allow you to:
            </p>
            <ul className="text-blue-800 space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <span>Send crypto to any wallet address instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <span>Send to multiple recipients at once (batch sending)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <span>Schedule recurring sends for regular payments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <span>Multi-signature approval for large amounts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <span>Transaction history and receipt generation</span>
              </li>
            </ul>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">🔒 Security First</h4>
            <p className="text-sm text-yellow-800">
              When this feature launches, you'll need your wallet's seed phrase to sign transactions.
              Make sure you have your seed phrase safely stored and accessible.
            </p>
          </div>

          {/* Alternatives for Now */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 What You Can Do Now</h4>
            <p className="text-sm text-gray-700 mb-3">
              While we're building the in-app send feature, you can:
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>Use your wallet's seed phrase with any compatible wallet app (e.g., Trust Wallet, Exodus)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>Import your seed phrase into the wallet app</span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>Send cryptocurrency from there</span>
              </li>
            </ul>
          </div>

          {/* Get Notified */}
          <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">🔔 Get Notified</h4>
            <p className="text-sm text-gray-700 mb-4">
              Want to be notified when this feature launches?
            </p>
            <Button disabled variant="outline">
              Notify Me (Coming Soon)
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard/wallets')} className="flex-1">
              Back to Wallets
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex-1">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
