/**
 * Wallet Creation Page
 *
 * Multi-step wizard for creating a new cryptocurrency wallet.
 *
 * Steps:
 * 1. Select blockchain (BTC, ETH, USDC, XRP)
 * 2. Add optional label
 * 3. Review and create
 * 4. Backup seed phrase
 * 5. Verify seed phrase
 * 6. Success - view wallet
 *
 * Security features:
 * - Non-custodial wallet creation
 * - Seed phrase shown only once
 * - Mandatory backup verification
 * - Rate limiting
 * - Audit logging
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SeedPhraseBackup } from '@/components/wallets/SeedPhraseBackup';
import { CHAIN_CONFIG, SUPPORTED_CHAINS } from '@/config/chains';
import type { Chain } from '@/config/chains';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';

/**
 * Wallet data from API response
 */
interface WalletData {
  id: string;
  address: string;
  chain: Chain;
  label: string | null;
  createdAt: string;
}

/**
 * Create wallet page component
 */
export default function CreateWalletPage() {
  const router = useRouter();
  const { user, church, isLoading: isAuthLoading, isLoadingChurches, error: authError } = useAuth();

  // Wizard steps
  const [step, setStep] = useState<
    'select-chain' | 'configure' | 'creating' | 'backup' | 'success'
  >('select-chain');

  // Form data
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [label, setLabel] = useState('');

  // API response data
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [mnemonic, setMnemonic] = useState<string>('');

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');

  /**
   * Redirect if user is not authenticated or has no church
   */
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!church && !isLoadingChurches) {
        // No church found - this shouldn't happen in MVP since signup creates a church
        // Redirect back to dashboard
        console.error('No church found for user - redirecting to dashboard');
        router.push('/dashboard');
      }
    }
  }, [user, church, isAuthLoading, isLoadingChurches, router]);

  /**
   * Show loading state while auth context is loading
   */
  if (isAuthLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
              <div className="text-lg font-semibold">Loading...</div>
              <p className="text-sm text-gray-600">Verifying your account</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Handle blockchain selection
   */
  const handleChainSelect = (chain: Chain) => {
    setSelectedChain(chain);
    setError('');
  };

  /**
   * Proceed to configuration step
   */
  const handleProceedToConfig = () => {
    if (!selectedChain) {
      setError('Please select a blockchain');
      return;
    }

    setStep('configure');
  };

  /**
   * Create wallet via API
   */
  const handleCreateWallet = async () => {
    if (!selectedChain) {
      setError('No blockchain selected');
      return;
    }

    if (!church) {
      setError('No church context available');
      return;
    }

    setIsCreating(true);
    setError('');
    setStep('creating');

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {}),
        },
        body: JSON.stringify({
          churchId: church.id,
          chain: selectedChain,
          label: label || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create wallet');
      }

      // Store wallet data and mnemonic
      setWalletData(result.wallet);
      setMnemonic(result.mnemonic);

      // Move to backup step
      setStep('backup');
    } catch (error) {
      console.error('Wallet creation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create wallet');
      setStep('configure');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle seed phrase verification complete
   */
  const handleBackupVerified = () => {
    // Clear mnemonic from memory (security)
    setMnemonic('');

    // Move to success step
    setStep('success');
  };

  /**
   * Navigate to wallet details
   */
  const handleViewWallet = () => {
    if (walletData) {
      router.push(`/dashboard/wallets/${walletData.id}`);
    }
  };

  /**
   * Create another wallet
   */
  const handleCreateAnother = () => {
    // Reset form
    setStep('select-chain');
    setSelectedChain(null);
    setLabel('');
    setWalletData(null);
    setMnemonic('');
    setError('');
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex-1 ${step !== 'select-chain' ? 'text-green-600' : ''}`}>
            <div className="text-sm font-medium">1. Select Blockchain</div>
          </div>
          <div className={`flex-1 ${step === 'backup' || step === 'success' ? 'text-green-600' : ''}`}>
            <div className="text-sm font-medium text-center">2. Configure</div>
          </div>
          <div className={`flex-1 ${step === 'success' ? 'text-green-600' : ''}`}>
            <div className="text-sm font-medium text-right">3. Backup</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{
              width:
                step === 'select-chain'
                  ? '33%'
                  : step === 'configure' || step === 'creating'
                    ? '66%'
                    : '100%',
            }}
          />
        </div>
      </div>

      {/* Step 1: Select blockchain */}
      {step === 'select-chain' && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Wallet</CardTitle>
            <CardDescription>
              Select which cryptocurrency you want to receive donations in
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUPPORTED_CHAINS.map((chain) => {
                const config = CHAIN_CONFIG[chain];
                const isSelected = selectedChain === chain;

                return (
                  <button
                    key={chain}
                    onClick={() => handleChainSelect(chain)}
                    className={`
                      p-6 rounded-lg border-2 text-left transition-all
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-2xl mb-1">{config.icon}</div>
                        <div className="font-bold text-lg">{config.name}</div>
                      </div>
                      {isSelected && <div className="text-green-600 text-xl">✓</div>}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">{config.fullName}</div>
                    <div className="text-xs text-gray-500">
                      {chain === 'USDC' && 'Stablecoin pegged to USD'}
                      {chain === 'BTC' && 'Original cryptocurrency'}
                      {chain === 'ETH' && 'Smart contract platform'}
                      {chain === 'XRP' && 'Fast, low-cost transfers'}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleProceedToConfig}
              disabled={!selectedChain}
              className="w-full"
              size="lg"
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Configure wallet */}
      {step === 'configure' && selectedChain && (
        <Card>
          <CardHeader>
            <CardTitle>Configure {CHAIN_CONFIG[selectedChain].name} Wallet</CardTitle>
            <CardDescription>
              Add an optional label to help identify this wallet
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Selected chain info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{CHAIN_CONFIG[selectedChain].icon}</div>
                <div>
                  <div className="font-semibold">{CHAIN_CONFIG[selectedChain].fullName}</div>
                  <div className="text-sm text-gray-600">
                    {selectedChain === 'XRP' && 'Minimum 10 XRP balance required to activate'}
                    {selectedChain === 'BTC' && 'Native SegWit (bc1) address for lower fees'}
                    {selectedChain === 'ETH' && 'Can receive ETH and all ERC-20 tokens'}
                    {selectedChain === 'USDC' && 'USD stablecoin on Ethereum'}
                  </div>
                </div>
              </div>
            </div>

            {/* Label input */}
            <div className="space-y-2">
              <Label htmlFor="label">
                Wallet Label (Optional)
              </Label>
              <Input
                id="label"
                type="text"
                placeholder={`e.g., "Sunday Offerings", "Building Fund", "Mission Trip"`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-gray-500">
                Help identify this wallet's purpose. You can always change this later.
              </p>
            </div>

            {/* Security notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-semibold mb-2">🔒 Security Notice</p>
              <p className="text-sm text-gray-700">
                After creation, you'll receive a 12-word seed phrase. This is the ONLY way to
                recover your wallet if you lose access. We do not store this phrase and cannot
                recover it for you.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('select-chain')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleCreateWallet}
              disabled={isCreating}
              className="flex-1"
              size="lg"
            >
              {isCreating ? 'Creating Wallet...' : 'Create Wallet'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Creating (loading state) */}
      {step === 'creating' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
              <div className="text-lg font-semibold">Creating your wallet...</div>
              <p className="text-sm text-gray-600">This will only take a moment</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Backup seed phrase */}
      {step === 'backup' && mnemonic && selectedChain && (
        <SeedPhraseBackup
          mnemonic={mnemonic}
          chain={CHAIN_CONFIG[selectedChain].name}
          onVerified={handleBackupVerified}
        />
      )}

      {/* Step 5: Success */}
      {step === 'success' && walletData && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">✓</div>
              <div>
                <CardTitle>Wallet Created Successfully!</CardTitle>
                <CardDescription>
                  Your {CHAIN_CONFIG[walletData.chain].name} wallet is ready to receive donations
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Wallet details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Blockchain</div>
                <div className="font-semibold">{CHAIN_CONFIG[walletData.chain].fullName}</div>
              </div>

              {walletData.label && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Label</div>
                  <div className="font-semibold">{walletData.label}</div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-gray-600">Address</div>
                <div className="font-mono text-sm break-all bg-white p-2 rounded border">
                  {walletData.address}
                </div>
              </div>
            </div>

            {/* Next steps */}
            <div className="space-y-2">
              <p className="font-semibold">Next Steps:</p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span>📊</span>
                  <span>Generate a QR code for easy donations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📤</span>
                  <span>Share your wallet address with donors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>👁️</span>
                  <span>Monitor incoming donations in real-time</span>
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button variant="outline" onClick={handleCreateAnother} className="flex-1">
              Create Another Wallet
            </Button>
            <Button onClick={handleViewWallet} className="flex-1">
              View Wallet Details
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
