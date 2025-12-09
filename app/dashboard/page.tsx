/**
 * Dashboard Home Page - Single-Page Experience
 *
 * Consolidated dashboard with panels and modals for all wallet operations.
 * No page navigation - everything happens here with smooth animations.
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Modal } from '@/components/ui/modal';
import { WalletDetailPanel } from '@/components/dashboard/WalletDetailPanel';
import { QRCodeModal } from '@/components/dashboard/QRCodeModal';
import { CreateWalletModal } from '@/components/dashboard/CreateWalletModal';
import { SwapModal } from '@/components/dashboard/SwapModal';
import { WithdrawModal } from '@/components/dashboard/WithdrawModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { CHAIN_CONFIG } from '@/config/chains';
import type { Chain } from '@/config/chains';

/**
 * Wallet summary data
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
 * Dashboard stats
 */
interface DashboardStats {
  totalBalanceUsd: number;
  activeWalletCount: number;
  totalDonations: number;
  wallets: WalletSummary[];
}

/**
 * Dashboard page - single-page experience
 */
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, church, isLoading: isAuthLoading, signOut } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Panel and modal state
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Prevent re-fetching stats on re-renders
  const hasFetchedStatsRef = useRef(false);
  // Track if we've already restored URL state on mount
  const hasRestoredUrlStateRef = useRef(false);

  /**
   * Fetch dashboard stats
   */
  const fetchStats = useCallback(async () => {
    if (!user || !church) return;

    try {
      setIsLoadingStats(true);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/churches/${church.id}/stats`, {
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [user, church]);

  useEffect(() => {
    if (hasFetchedStatsRef.current) return;

    if (!isAuthLoading && user && church) {
      fetchStats();
      hasFetchedStatsRef.current = true;
    }
  }, [user, church, isAuthLoading, fetchStats]);

  /**
   * Handle URL state on initial mount only
   * This prevents modals from reopening on page refresh
   */
  useEffect(() => {
    if (hasRestoredUrlStateRef.current) return;

    const walletParam = searchParams.get('wallet');
    const actionParam = searchParams.get('action');

    if (walletParam) {
      setSelectedWalletId(walletParam);
    }

    if (actionParam === 'create') {
      setShowCreateModal(true);
      // Clear the action param from URL immediately to prevent reopen on refresh
      window.history.replaceState(null, '', '/dashboard');
    }

    hasRestoredUrlStateRef.current = true;
  }, [searchParams]);

  /**
   * Update URL when wallet panel opens/closes
   */
  useEffect(() => {
    if (selectedWalletId) {
      window.history.replaceState(null, '', `/dashboard?wallet=${selectedWalletId}`);
    } else {
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [selectedWalletId]);

  /**
   * Handle sign out
   */
  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
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
   * Handle wallet click
   */
  const handleWalletClick = (walletId: string) => {
    setSelectedWalletId(walletId);
  };

  /**
   * Handle create wallet
   */
  const handleOpenCreateWallet = () => {
    setShowCreateModal(true);
    window.history.replaceState(null, '', '/dashboard?action=create');
  };

  /**
   * Handle close create wallet
   */
  const handleCloseCreateWallet = () => {
    // Modal will handle the confirmation via CreateWalletModal's handleCancel
    setShowCreateModal(false);
    window.history.replaceState(null, '', '/dashboard');
  };

  /**
   * Handle wallet created successfully
   */
  const handleWalletCreated = (wallet: any) => {
    setShowCreateModal(false);
    window.history.replaceState(null, '', '/dashboard');

    // Refresh stats
    hasFetchedStatsRef.current = false;
    fetchStats();

    // Open the new wallet
    setSelectedWalletId(wallet.id);
  };

  /**
   * Get selected wallet data
   */
  const selectedWallet = stats?.wallets.find((w) => w.id === selectedWalletId);

  /**
   * Handle delete wallet
   */
  const handleDeleteWallet = async () => {
    if (!selectedWallet) return;

    const confirmMessage = `Are you sure you want to delete this wallet?\n\nLabel: ${selectedWallet.label || 'Unnamed'}\nAddress: ${selectedWallet.address}\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`/api/wallets/${selectedWalletId}`, {
        method: 'DELETE',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete wallet');
      }

      alert('Wallet deleted successfully');

      // Close panel and refresh
      setSelectedWalletId(null);
      hasFetchedStatsRef.current = false;
      fetchStats();
    } catch (error) {
      console.error('Error deleting wallet:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete wallet');
    }
  };

  /**
   * Loading state
   */
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !church) {
    return null;
  }

  const totalBalance = stats?.totalBalanceUsd || 0;
  const walletCount = stats?.activeWalletCount || 0;
  const donationCount = stats?.totalDonations || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">{church.name}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/dashboard/profile')}>
                Profile & Settings
              </Button>
              <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}! 👋
          </h2>
          <p className="text-lg text-gray-600">
            Here's what's happening with your crypto donations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-9 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold">${totalBalance.toFixed(2)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {walletCount === 0 ? 'No wallets created yet' : `Across ${walletCount} wallet${walletCount !== 1 ? 's' : ''}`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Active Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-9 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold">{walletCount}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {walletCount === 0 ? 'Create your first wallet' : 'Ready to receive donations'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="animate-pulse">
                  <div className="h-9 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold">{donationCount}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {donationCount === 0 ? 'No donations received yet' : 'Transactions recorded'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Wallets List */}
        {!isLoadingStats && stats && stats.wallets.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Wallets</CardTitle>
              <CardDescription>
                Click on a wallet to view details, generate QR codes, and manage funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.wallets.map((wallet) => {
                  const chainConfig = CHAIN_CONFIG[wallet.chain];
                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleWalletClick(wallet.id)}
                      className="w-full"
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{chainConfig.icon}</div>
                          <div className="text-left">
                            <div className="font-semibold">
                              {wallet.label || `${chainConfig.name} Wallet`}
                            </div>
                            <div className="text-sm text-gray-600 font-mono">
                              {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {wallet.balanceCrypto} {chainConfig.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            ${parseFloat(wallet.balanceUsd).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              {walletCount === 0
                ? 'Get started by creating your first crypto wallet'
                : 'Manage your wallets and generate QR codes'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                className="w-full h-24 text-lg"
                onClick={handleOpenCreateWallet}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span>Create Wallet</span>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-24 text-lg"
                onClick={() => {
                  if (stats && stats.wallets.length > 0) {
                    handleWalletClick(stats.wallets[0].id);
                  }
                }}
                disabled={walletCount === 0}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <span>View Wallets</span>
                  {walletCount === 0 && (
                    <span className="text-xs">(Create wallet first)</span>
                  )}
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-24 text-lg"
                onClick={() => router.push('/dashboard/help')}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">📚</span>
                  <span>Help & Learn</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started Guide - only show if no wallets */}
        {walletCount === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Follow these steps to start accepting crypto donations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Create a Wallet</h3>
                    <p className="text-sm text-gray-600">
                      Generate a secure BTC or USDC wallet to receive donations. Your seed phrase will be shown once - save it securely!
                    </p>
                    <Button
                      variant="link"
                      className="px-0"
                      onClick={handleOpenCreateWallet}
                    >
                      Create Wallet →
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 opacity-50">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Generate QR Code</h3>
                    <p className="text-sm text-gray-600">
                      Create a scannable QR code for easy donations. Perfect for bulletins, displays, or your website.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 opacity-50">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Share with Your Church</h3>
                    <p className="text-sm text-gray-600">
                      Display your QR code in services, newsletters, and online to start receiving donations.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MVP Notice */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>MVP Version:</strong> This is an early version with BTC and USDC support. More features coming soon!
          </p>
        </div>
      </main>

      {/* Wallet Detail Panel */}
      {selectedWalletId && (
        <SlidePanel
          isOpen={true}
          onClose={() => setSelectedWalletId(null)}
          title="Wallet Details"
          width="xl"
        >
          <WalletDetailPanel
            walletId={selectedWalletId}
            onGenerateQR={() => setShowQRModal(true)}
            onSwap={() => setShowSwapModal(true)}
            onWithdraw={() => setShowWithdrawModal(true)}
            onDelete={handleDeleteWallet}
            onOpenFullPage={() => router.push(`/dashboard/wallets/${selectedWalletId}`)}
          />
        </SlidePanel>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedWallet && (
        <Modal
          isOpen={true}
          onClose={() => setShowQRModal(false)}
          title="Generate QR Code"
          size="lg"
        >
          <QRCodeModal
            walletId={selectedWallet.id}
            walletAddress={selectedWallet.address}
            walletChain={selectedWallet.chain}
            walletLabel={selectedWallet.label}
            churchName={church.name}
          />
        </Modal>
      )}

      {/* Create Wallet Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={handleCloseCreateWallet}
          size="3xl"
          showCloseButton={false}
          preventClose={true}
        >
          <CreateWalletModal
            onSuccess={handleWalletCreated}
            onCancel={handleCloseCreateWallet}
          />
        </Modal>
      )}

      {/* Swap Modal */}
      {showSwapModal && selectedWallet && (
        <Modal
          isOpen={true}
          onClose={() => setShowSwapModal(false)}
          title="Swap Cryptocurrency"
          size="lg"
        >
          <SwapModal
            walletAddress={selectedWallet.address}
            walletChain={selectedWallet.chain}
            walletLabel={selectedWallet.label}
          />
        </Modal>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedWallet && (
        <Modal
          isOpen={true}
          onClose={() => setShowWithdrawModal(false)}
          title="Withdraw to Bank"
          size="lg"
        >
          <WithdrawModal
            walletAddress={selectedWallet.address}
            walletChain={selectedWallet.chain}
            walletLabel={selectedWallet.label}
            balanceCrypto={selectedWallet.balanceCrypto}
            balanceUsd={selectedWallet.balanceUsd}
          />
        </Modal>
      )}
    </div>
  );
}
