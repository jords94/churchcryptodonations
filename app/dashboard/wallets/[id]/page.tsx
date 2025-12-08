/**
 * Wallet Detail Page
 *
 * Displays comprehensive information about a specific wallet including:
 * - Wallet address with copy functionality
 * - QR code for receiving donations
 * - Current balance (crypto and USD)
 * - Transaction history
 * - Wallet management actions
 *
 * This page fetches wallet data from the API and provides a central
 * hub for monitoring and managing cryptocurrency donations.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CHAIN_CONFIG } from '@/config/chains';
import type { Chain } from '@/config/chains';

/**
 * Wallet data from API
 */
interface WalletData {
  id: string;
  address: string;
  chain: Chain;
  label: string | null;
  balanceCrypto: string;
  balanceUsd: string;
  lastBalanceUpdate: string | null;
  createdAt: string;
  isActive: boolean;
}

/**
 * Transaction data from blockchain
 */
interface Transaction {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountCrypto: string;
  amountUsd: number;
  confirmations: number;
  blockNumber: string;
  transactedAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

/**
 * Wallet detail page component
 */
export default function WalletDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, church, isLoading: isAuthLoading } = useAuth();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string>('');

  // Track if we've fetched this wallet to prevent unnecessary re-fetches
  const hasFetchedRef = useRef(false);
  const currentWalletIdRef = useRef(params.id);

  /**
   * Fetch wallet data
   */
  useEffect(() => {
    // Reset if wallet ID changed
    if (currentWalletIdRef.current !== params.id) {
      hasFetchedRef.current = false;
      currentWalletIdRef.current = params.id;
      setWallet(null);
    }

    // Skip if already fetched this wallet
    if (hasFetchedRef.current) {
      return;
    }

    const fetchWallet = async () => {
      if (!user || !church) return;

      try {
        setIsLoading(true);
        setError('');

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/wallets/${params.id}`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Wallet not found');
          } else if (response.status === 403) {
            setError('You do not have permission to view this wallet');
          } else {
            setError('Failed to load wallet');
          }
          return;
        }

        const data = await response.json();
        setWallet(data.wallet);
        hasFetchedRef.current = true; // Mark as fetched
      } catch (error) {
        console.error('Error fetching wallet:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthLoading && user && church) {
      fetchWallet();
    }
  }, [params.id, user, church, isAuthLoading]);

  /**
   * Fetch transaction history
   */
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!wallet || !user) return;

      try {
        setIsLoadingTransactions(true);
        setTransactionsError('');

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/wallets/${params.id}/transactions`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (!response.ok) {
          if (response.status === 404) {
            setTransactionsError('Wallet not found');
          } else if (response.status === 403) {
            setTransactionsError('Access denied');
          } else {
            setTransactionsError('Failed to load transactions');
          }
          return;
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactionsError('An unexpected error occurred');
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    if (wallet) {
      fetchTransactions();
    }
  }, [wallet, user, params.id]);

  /**
   * Copy address to clipboard
   */
  const handleCopyAddress = async () => {
    if (!wallet) return;

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  /**
   * Navigate to QR code generator
   */
  const handleGenerateQR = () => {
    router.push(`/dashboard/qr-codes/create?walletId=${params.id}`);
  };

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
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
              <div className="text-lg font-semibold">Loading wallet...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error || !wallet) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Wallet not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chainConfig = CHAIN_CONFIG[wallet.chain];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      <div className="space-y-6">
        {/* Wallet Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{chainConfig.icon}</div>
                <div>
                  <CardTitle className="text-2xl">
                    {wallet.label || `${chainConfig.name} Wallet`}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {chainConfig.fullName}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGenerateQR}>
                  Generate QR Code
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Wallet Address */}
            <div>
              <label className="text-sm font-medium text-gray-600">Wallet Address</label>
              <div className="mt-2 flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-sm break-all">
                  {wallet.address}
                </div>
                <Button variant="outline" onClick={handleCopyAddress}>
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Share this address to receive {chainConfig.name} donations
              </p>
            </div>

            {/* Balance Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-900">Crypto Balance</div>
                <div className="mt-2 text-2xl font-bold text-blue-900">
                  {wallet.balanceCrypto} {chainConfig.name}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-900">USD Value</div>
                <div className="mt-2 text-2xl font-bold text-green-900">
                  ${parseFloat(wallet.balanceUsd).toFixed(2)}
                </div>
                {wallet.lastBalanceUpdate && (
                  <div className="mt-1 text-xs text-green-700">
                    Last updated: {new Date(wallet.lastBalanceUpdate).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="text-sm font-medium text-gray-600">Created</div>
                <div className="mt-1 text-sm">
                  {new Date(wallet.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Status</div>
                <div className="mt-1">
                  {wallet.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Recent donations and transactions for this wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <div className="mt-4 text-sm text-gray-600">Loading transactions...</div>
              </div>
            ) : transactionsError ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⚠️</div>
                <div className="text-lg font-medium text-red-900">Error Loading Transactions</div>
                <p className="mt-2 text-sm text-red-600">{transactionsError}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-lg font-medium text-gray-900">No transactions yet</div>
                <p className="mt-2 text-sm text-gray-600">
                  Transaction history will appear here once donations are received
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => {
                  // Get blockchain explorer URL
                  const getExplorerUrl = () => {
                    if (wallet.chain === 'BTC') {
                      return `https://blockchain.info/tx/${tx.txHash}`;
                    } else if (wallet.chain === 'USDC' || wallet.chain === 'ETH') {
                      return `https://etherscan.io/tx/${tx.txHash}`;
                    }
                    return '#';
                  };

                  // Format address for display (shortened)
                  const formatAddress = (addr: string) => {
                    if (!addr || addr === 'Unknown') return 'Unknown';
                    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                  };

                  return (
                    <div
                      key={tx.txHash}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Transaction Hash */}
                          <div className="flex items-center gap-2 mb-2">
                            <a
                              href={getExplorerUrl()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
                            >
                              {formatAddress(tx.txHash)}
                            </a>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                tx.status === 'CONFIRMED'
                                  ? 'bg-green-100 text-green-800'
                                  : tx.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </div>

                          {/* From/To Addresses */}
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              <span className="font-medium">From:</span>{' '}
                              <span className="font-mono">{formatAddress(tx.fromAddress)}</span>
                            </div>
                            <div>
                              <span className="font-medium">To:</span>{' '}
                              <span className="font-mono">{formatAddress(tx.toAddress)}</span>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <div>
                              <span className="font-medium">Date:</span>{' '}
                              {new Date(tx.transactedAt).toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Confirmations:</span> {tx.confirmations}
                            </div>
                            {tx.blockNumber !== '0' && (
                              <div>
                                <span className="font-medium">Block:</span> {tx.blockNumber}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="ml-4 text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{tx.amountCrypto} {chainConfig.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            ${tx.amountUsd.toFixed(2)} USD
                          </div>
                        </div>
                      </div>

                      {/* View on Explorer Link */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <a
                          href={getExplorerUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          View on blockchain explorer
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleGenerateQR}
              >
                <span className="text-2xl">📱</span>
                <span>Generate QR Code</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                disabled
              >
                <span className="text-2xl">📤</span>
                <span>Share Link</span>
                <span className="text-xs text-gray-500">(Coming soon)</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                disabled
              >
                <span className="text-2xl">📊</span>
                <span>Export Report</span>
                <span className="text-xs text-gray-500">(Coming soon)</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-yellow-900">Security Reminder</h3>
              <p className="mt-1 text-sm text-yellow-800">
                This is a non-custodial wallet. You control the private keys through your seed phrase.
                Make sure you have securely backed up your 12-word recovery phrase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
