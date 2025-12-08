/**
 * Wallets List Page
 *
 * Displays all wallets for the current church with:
 * - List of all active wallets
 * - Quick actions (Create, Import)
 * - Wallet details preview
 * - Links to individual wallet pages
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
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
  isActive: boolean;
}

/**
 * Wallets list page
 */
export default function WalletsListPage() {
  const router = useRouter();
  const { user, church, isLoading: isAuthLoading } = useAuth();

  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  /**
   * Fetch wallets
   */
  useEffect(() => {
    if (hasFetchedRef.current) return;

    const fetchWallets = async () => {
      if (!user || !church) return;

      try {
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/churches/${church.id}/stats`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (response.ok) {
          const data = await response.json();
          setWallets(data.wallets || []);
          hasFetchedRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching wallets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthLoading && user && church) {
      fetchWallets();
    }
  }, [user, church, isAuthLoading]);

  /**
   * Redirect if not authenticated
   */
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  /**
   * Loading state
   */
  if (isAuthLoading || isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
              <div className="text-lg font-semibold">Loading wallets...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Wallets</h1>
          <p className="text-gray-600 mt-1">
            Manage your crypto donation wallets
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </Button>
          <Link href="/dashboard/wallets/import">
            <Button variant="outline">Import Wallet</Button>
          </Link>
          <Link href="/dashboard/wallets/create">
            <Button>+ Create Wallet</Button>
          </Link>
        </div>
      </div>

      {/* Wallets List */}
      {wallets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Wallets Yet</CardTitle>
            <CardDescription>
              Create your first crypto wallet to start accepting donations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Link href="/dashboard/wallets/create">
                <Button>Create Wallet</Button>
              </Link>
              <Link href="/dashboard/wallets/import">
                <Button variant="outline">Import Existing Wallet</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {wallets.map((wallet) => {
            const chainConfig = CHAIN_CONFIG[wallet.chain];
            return (
              <Card key={wallet.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Wallet Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-5xl">{chainConfig.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">
                          {wallet.label || `${chainConfig.name} Wallet`}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {chainConfig.fullName}
                        </p>
                        <p className="text-sm font-mono text-gray-500 mt-2">
                          {wallet.address.slice(0, 12)}...{wallet.address.slice(-10)}
                        </p>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right mr-6">
                      <div className="text-2xl font-bold">
                        {wallet.balanceCrypto} {chainConfig.name}
                      </div>
                      <div className="text-lg text-gray-600">
                        ${parseFloat(wallet.balanceUsd).toFixed(2)} USD
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Link href={`/dashboard/wallets/${wallet.id}`}>
                        <Button className="w-full">View Details</Button>
                      </Link>
                      <Link href={`/dashboard/qr-codes/create?walletId=${wallet.id}`}>
                        <Button variant="outline" className="w-full">QR Code</Button>
                      </Link>
                      <Link href={`/dashboard/wallets/send?walletId=${wallet.id}`}>
                        <Button variant="outline" className="w-full">Send</Button>
                      </Link>
                      <Link href={`/dashboard/wallets/swap?walletId=${wallet.id}`}>
                        <Button variant="outline" className="w-full">Swap</Button>
                      </Link>
                      <Link href={`/dashboard/wallets/withdraw?walletId=${wallet.id}`}>
                        <Button variant="outline" className="w-full">Withdraw</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MoonPay Notice */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">MoonPay Integration</h3>
        <p className="text-sm text-blue-800 mb-2">
          Swap and Withdraw features are powered by MoonPay. To use these features, add your MoonPay API keys to the environment variables.
        </p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ Swap between cryptocurrencies</li>
          <li>✅ Withdraw to bank account</li>
          <li>✅ Buy crypto with QR codes</li>
        </ul>
      </div>

      {/* Coming Soon Features */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Send cryptocurrency (in-app transactions)</li>
          <li>• Transaction history and analytics</li>
          <li>• Multi-signature wallets</li>
          <li>• Recurring donations</li>
          <li>• Email receipts for donors</li>
        </ul>
      </div>
    </div>
  );
}
