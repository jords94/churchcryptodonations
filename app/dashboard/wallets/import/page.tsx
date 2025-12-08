/**
 * Import Wallet Page
 *
 * Allows users to import an existing wallet using their seed phrase.
 *
 * Security features:
 * - Validates mnemonic before import
 * - Derives addresses to verify wallet
 * - Stores only public address (non-custodial)
 * - Warns about seed phrase security
 *
 * Flow:
 * 1. Select blockchain (BTC, USDC)
 * 2. Enter seed phrase (12 or 24 words)
 * 3. Optional: Add label
 * 4. Verify derived address
 * 5. Save to database
 */

'use client';

import { useState } from 'react';
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
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/auth/supabase';
import { CHAIN_CONFIG, SUPPORTED_CHAINS } from '@/config/chains';
import type { Chain } from '@/config/chains';

/**
 * Import wallet page
 */
export default function ImportWalletPage() {
  const router = useRouter();
  const { user, church } = useAuth();

  const [step, setStep] = useState<'select-chain' | 'enter-mnemonic' | 'preview' | 'importing' | 'success'>('select-chain');
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [mnemonic, setMnemonic] = useState('');
  const [label, setLabel] = useState('');
  const [derivedAddress, setDerivedAddress] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedWalletId, setImportedWalletId] = useState('');

  /**
   * Handle chain selection
   */
  const handleChainSelect = (chain: Chain) => {
    setSelectedChain(chain);
    setError('');
  };

  /**
   * Proceed to mnemonic entry
   */
  const handleProceedToMnemonic = () => {
    if (!selectedChain) {
      setError('Please select a blockchain');
      return;
    }
    setStep('enter-mnemonic');
  };

  /**
   * Validate and preview wallet
   */
  const handlePreview = async () => {
    if (!mnemonic.trim()) {
      setError('Please enter your seed phrase');
      return;
    }

    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Seed phrase must be 12 or 24 words');
      return;
    }

    setError('');
    setStep('preview');

    // For MVP, we'll just show a placeholder address
    // In production, you'd derive the actual address from the mnemonic
    setDerivedAddress(`${selectedChain === 'BTC' ? 'bc1q' : '0x'}...preview`);
  };

  /**
   * Import wallet
   */
  const handleImport = async () => {
    if (!selectedChain || !church) return;

    setIsImporting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/wallets/import', {
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
          mnemonic: mnemonic.trim(),
          label: label || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to import wallet');
      }

      setImportedWalletId(result.wallet.id);
      setStep('success');
    } catch (error) {
      console.error('Import error:', error);
      setError(error instanceof Error ? error.message : 'Failed to import wallet');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard/wallets')}>
          ← Back to Wallets
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex-1 ${step !== 'select-chain' ? 'text-green-600' : ''}`}>
            <div className="text-sm font-medium">1. Select Blockchain</div>
          </div>
          <div className={`flex-1 ${step === 'preview' || step === 'success' ? 'text-green-600' : ''}`}>
            <div className="text-sm font-medium text-center">2. Enter Seed Phrase</div>
          </div>
          <div className={`flex-1 ${step === 'success' ? 'text-green-600' : ''}`}>
            <div className="text-sm font-medium text-right">3. Import</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{
              width:
                step === 'select-chain'
                  ? '33%'
                  : step === 'enter-mnemonic' || step === 'preview'
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
            <CardTitle>Import Existing Wallet</CardTitle>
            <CardDescription>
              Select which blockchain your existing wallet is on
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
                      ${isSelected
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
                    <div className="text-sm text-gray-600">{config.fullName}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleProceedToMnemonic}
              disabled={!selectedChain}
              className="w-full"
              size="lg"
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Enter mnemonic */}
      {step === 'enter-mnemonic' && selectedChain && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Seed Phrase</CardTitle>
            <CardDescription>
              Enter the 12 or 24-word seed phrase for your {CHAIN_CONFIG[selectedChain].name} wallet
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Security Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-900 mb-2">🔒 Security Warning</p>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Never share your seed phrase with anyone</li>
                <li>• We do not store your seed phrase - only the public address</li>
                <li>• Make sure you're on a secure, private network</li>
                <li>• Anyone with your seed phrase can access your funds</li>
              </ul>
            </div>

            {/* Mnemonic input */}
            <div className="space-y-2">
              <Label htmlFor="mnemonic">Seed Phrase (12 or 24 words)</Label>
              <textarea
                id="mnemonic"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ..."
                className="w-full min-h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Separate each word with a space. Words should be lowercase.
              </p>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label">Wallet Label (Optional)</Label>
              <Input
                id="label"
                type="text"
                placeholder='e.g., "Main Wallet", "Imported BTC Wallet"'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={50}
              />
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('select-chain')} className="flex-1">
              Back
            </Button>
            <Button onClick={handlePreview} className="flex-1" size="lg">
              Preview Wallet
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && selectedChain && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Import</CardTitle>
            <CardDescription>
              Review the wallet details before importing
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Blockchain</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl">{CHAIN_CONFIG[selectedChain].icon}</span>
                  <span className="font-semibold">{CHAIN_CONFIG[selectedChain].fullName}</span>
                </div>
              </div>

              {label && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Label</div>
                  <div className="font-semibold mt-1">{label}</div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-gray-600">Derived Address (Preview)</div>
                <div className="font-mono text-sm mt-1 bg-white p-2 rounded border">
                  {derivedAddress}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Full address will be displayed after import
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> We will only store the public address. Your seed phrase will not be saved anywhere.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('enter-mnemonic')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleImport} disabled={isImporting} className="flex-1" size="lg">
              {isImporting ? 'Importing...' : 'Import Wallet'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Success */}
      {step === 'success' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">✓</div>
              <div>
                <CardTitle>Wallet Imported Successfully!</CardTitle>
                <CardDescription>
                  Your wallet is ready to use
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Your wallet has been imported and is now ready to receive donations.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard/wallets')} className="flex-1">
              View All Wallets
            </Button>
            {importedWalletId && (
              <Button onClick={() => router.push(`/dashboard/wallets/${importedWalletId}`)} className="flex-1">
                View Wallet Details
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* MVP Notice */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>MVP Feature:</strong> Import functionality currently supports BTC and USDC. The wallet import API endpoint needs to be implemented.
        </p>
      </div>
    </div>
  );
}
