/**
 * WalletDetailPanel Component
 *
 * Slide-out panel showing detailed wallet information, transactions, and quick actions
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { Button } from '@/components/ui/button';
import { CHAIN_CONFIG } from '@/config/chains';
import type { Chain } from '@/config/chains';
import { Copy, ExternalLink, RefreshCw, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface WalletDetailPanelProps {
  walletId: string;
  onGenerateQR: () => void;
  onSwap: () => void;
  onWithdraw: () => void;
  onDelete: () => void;
  onOpenFullPage?: () => void;
}

export function WalletDetailPanel({
  walletId,
  onGenerateQR,
  onSwap,
  onWithdraw,
  onDelete,
  onOpenFullPage,
}: WalletDetailPanelProps) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionsError, setTransactionsError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Value history chart state
  const [valueHistory, setValueHistory] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartRange, setChartRange] = useState<'24h' | '7d' | '30d' | '90d' | '1y' | 'all'>('30d');

  // Fetch wallet data
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user) return;

      try {
        setIsLoadingWallet(true);
        setError('');

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/wallets/${walletId}`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (!response.ok) {
          throw new Error('Failed to load wallet');
        }

        const data = await response.json();
        setWallet(data.wallet);
      } catch (error) {
        console.error('Error fetching wallet:', error);
        setError('Failed to load wallet details');
      } finally {
        setIsLoadingWallet(false);
      }
    };

    fetchWallet();
  }, [walletId, user]);

  // Fetch value history for chart
  useEffect(() => {
    const fetchValueHistory = async () => {
      if (!wallet || !user) return;

      try {
        setIsLoadingChart(true);

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/wallets/${walletId}/value-history?range=${chartRange}`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (response.ok) {
          const data = await response.json();
          setValueHistory(data.history || []);
        }
      } catch (error) {
        console.error('Error fetching value history:', error);
      } finally {
        setIsLoadingChart(false);
      }
    };

    if (wallet) {
      fetchValueHistory();
    }
  }, [wallet, walletId, user, chartRange]);

  // Fetch transactions with simple cache
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!wallet || !user) return;

      try {
        setIsLoadingTransactions(true);
        setTransactionsError('');

        // TODO: Replace with proper database caching later
        // Simple localStorage cache to avoid rate limits during testing
        const cacheKey = `tx_cache_${walletId}`;
        const cacheTimeKey = `tx_cache_time_${walletId}`;
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        // Check cache first
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);

        if (cachedData && cachedTime) {
          const cacheAge = Date.now() - parseInt(cachedTime);
          if (cacheAge < CACHE_DURATION) {
            // Use cached data
            setTransactions(JSON.parse(cachedData));
            setIsLoadingTransactions(false);
            console.log('Using cached transaction data (age: ' + Math.round(cacheAge / 1000) + 's)');
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`/api/wallets/${walletId}/transactions`, {
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });

        if (response.ok) {
          const data = await response.json();
          const txData = data.transactions || [];
          setTransactions(txData);

          // Cache the results
          localStorage.setItem(cacheKey, JSON.stringify(txData));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } else if (response.status === 429 || response.status === 500) {
          // Rate limit - use stale cache if available
          if (cachedData) {
            setTransactions(JSON.parse(cachedData));
            setTransactionsError('Showing cached data. Blockchain API rate limit reached.');
          } else {
            setTransactionsError('Blockchain API rate limit reached. Please try again in a few minutes.');
          }
        } else {
          setTransactionsError('Failed to load transactions.');
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactionsError('Unable to connect to blockchain API. Please try again later.');
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    if (wallet) {
      fetchTransactions();
    }
  }, [wallet, walletId, user]);

  // Copy address to clipboard
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

  if (isLoadingWallet) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600">{error || 'Wallet not found'}</p>
        </div>
      </div>
    );
  }

  const chainConfig = CHAIN_CONFIG[wallet.chain];
  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);

  const getExplorerUrl = (txHash: string) => {
    if (wallet.chain === 'BTC') {
      return `https://blockchain.info/tx/${txHash}`;
    } else if (wallet.chain === 'USDC') {
      return `https://etherscan.io/tx/${txHash}`;
    }
    return '#';
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr === 'Unknown') return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div>
      {/* Wallet Header */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">{chainConfig.icon}</div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {wallet.label || `${chainConfig.name} Wallet`}
            </h3>
            <p className="text-sm text-gray-600">{chainConfig.fullName}</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-medium text-blue-900 mb-1">Balance</div>
            <div className="text-lg font-bold text-blue-900">
              {wallet.balanceCrypto} {chainConfig.name}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs font-medium text-green-900 mb-1">USD Value</div>
            <div className="text-lg font-bold text-green-900">
              ${parseFloat(wallet.balanceUsd).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="p-6 border-b">
        <label className="text-sm font-medium text-gray-600 block mb-2">
          Wallet Address
        </label>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs break-all">
            {wallet.address}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAddress}
            className="flex-shrink-0"
          >
            {copied ? (
              <>✓ Copied</>
            ) : (
              <><Copy className="w-4 h-4 mr-1" /> Copy</>
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Share this address to receive {chainConfig.name} donations
        </p>
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-b">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onGenerateQR} className="w-full">
            📱 QR Code
          </Button>
          <Button variant="outline" onClick={onSwap} className="w-full">
            🔄 Swap
          </Button>
          <Button variant="outline" onClick={onWithdraw} className="w-full">
            💰 Withdraw
          </Button>
          {onOpenFullPage && (
            <Button variant="outline" onClick={onOpenFullPage} className="w-full">
              🔗 Full Page
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onDelete}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            🗑️ Delete
          </Button>
        </div>
      </div>

      {/* Value Over Time Chart */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900">Value Over Time</h4>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {(['24h', '7d', '30d', '90d', '1y', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setChartRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                chartRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '24h' && '24 Hours'}
              {range === '7d' && '7 Days'}
              {range === '30d' && '30 Days'}
              {range === '90d' && '90 Days'}
              {range === '1y' && '1 Year'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>

        {/* Chart */}
        {isLoadingChart ? (
          <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : valueHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg">
            <TrendingUp className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-sm text-gray-600">No historical data yet</p>
            <p className="text-xs text-gray-500 mt-1">Data will accumulate over time</p>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="snapshotAt"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (chartRange === '24h') {
                      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    } else if (chartRange === '7d' || chartRange === '30d') {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }
                  }}
                  tick={{ fontSize: 10 }}
                  stroke="#999"
                />
                <YAxis
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  tick={{ fontSize: 10 }}
                  stroke="#999"
                  width={50}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'USD Value']}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balanceUsd"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900">
            Recent Transactions
          </h4>
          {isLoadingTransactions && (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>

        {transactionsError ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm font-medium text-gray-900 mb-2">Unable to Load Transactions</p>
            <p className="text-xs text-gray-600 mb-4">{transactionsError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-gray-600">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedTransactions.map((tx) => (
                <div
                  key={tx.txHash}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Header: Amount and Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-lg font-bold text-green-600">
                          +{tx.amountCrypto} {chainConfig.name}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
                      <div className="text-sm text-gray-600">
                        ${tx.amountUsd.toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="space-y-2 mb-3">
                    {/* Transaction Hash */}
                    <div className="flex items-start">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">TX Hash:</span>
                      <span className="text-xs font-mono text-gray-900 break-all">
                        {tx.txHash}
                      </span>
                    </div>

                    {/* From Address */}
                    <div className="flex items-start">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">From:</span>
                      <span className="text-xs font-mono text-gray-700">
                        {formatAddress(tx.fromAddress)}
                      </span>
                    </div>

                    {/* To Address */}
                    <div className="flex items-start">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">To:</span>
                      <span className="text-xs font-mono text-gray-700">
                        {formatAddress(tx.toAddress)}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-start">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">Time:</span>
                      <span className="text-xs text-gray-700">
                        {new Date(tx.transactedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Confirmations */}
                    <div className="flex items-start">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">Confirms:</span>
                      <span className="text-xs text-gray-700">
                        {tx.confirmations} {tx.confirmations === 1 ? 'confirmation' : 'confirmations'}
                      </span>
                    </div>

                    {/* Block Number */}
                    {tx.blockNumber && (
                      <div className="flex items-start">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">Block:</span>
                        <span className="text-xs text-gray-700">
                          #{tx.blockNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Explorer Link */}
                  <a
                    href={getExplorerUrl(tx.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View on Block Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>

            {transactions.length > 5 && (
              <Button
                variant="outline"
                onClick={() => setShowAllTransactions(!showAllTransactions)}
                className="w-full mt-4"
              >
                {showAllTransactions
                  ? 'Show Less'
                  : `Show All (${transactions.length})`}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Wallet Info Footer */}
      <div className="p-6 border-t bg-gray-50 text-xs text-gray-600">
        <div>
          <span className="font-medium">Created:</span>{' '}
          {new Date(wallet.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
