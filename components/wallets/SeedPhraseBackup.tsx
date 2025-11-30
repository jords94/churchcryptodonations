/**
 * Seed Phrase Backup Component
 *
 * Critical security component for displaying and verifying backup of seed phrases.
 *
 * Features:
 * - Displays 12-word mnemonic in groups of 4
 * - Copy to clipboard functionality
 * - Verification step (user must enter random words)
 * - Clear security warnings
 * - Cannot proceed without verification
 *
 * Security principles:
 * - Seed phrase shown only once
 * - User must verify they've written it down
 * - Clear warnings about loss of funds
 * - No storage of seed phrase in state after verification
 */

'use client';

import { useState } from 'react';
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
import { splitMnemonicIntoGroups, getRandomWordsForVerification } from '@/lib/crypto/walletGenerator';

/**
 * Component props
 */
interface SeedPhraseBackupProps {
  mnemonic: string; // 12-word seed phrase
  onVerified: () => void; // Callback when user verifies backup
  chain: string; // Blockchain name (for display)
}

/**
 * Seed phrase backup and verification component
 */
export function SeedPhraseBackup({ mnemonic, onVerified, chain }: SeedPhraseBackupProps) {
  const [step, setStep] = useState<'display' | 'verify'>('display');
  const [copied, setCopied] = useState(false);
  const [verificationWords, setVerificationWords] = useState<
    Array<{ index: number; word: string }>
  >([]);
  const [userInputs, setUserInputs] = useState<Record<number, string>>({});
  const [verificationError, setVerificationError] = useState<string>('');

  /**
   * Copy seed phrase to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);

      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  /**
   * Proceed to verification step
   */
  const handleProceedToVerification = () => {
    // Generate random words for verification (3 words)
    const randomWords = getRandomWordsForVerification(mnemonic, 3);
    setVerificationWords(randomWords);
    setStep('verify');
  };

  /**
   * Verify user's answers
   */
  const handleVerify = () => {
    setVerificationError('');

    // Check if all words are entered
    const allEntered = verificationWords.every((word) => userInputs[word.index]?.trim());

    if (!allEntered) {
      setVerificationError('Please enter all requested words');
      return;
    }

    // Check if all words match (case-insensitive)
    const allCorrect = verificationWords.every(
      (word) => userInputs[word.index]?.toLowerCase().trim() === word.word.toLowerCase()
    );

    if (!allCorrect) {
      setVerificationError(
        'One or more words are incorrect. Please check your backup and try again.'
      );
      return;
    }

    // Verification successful
    onVerified();
  };

  /**
   * Update verification input
   */
  const handleInputChange = (index: number, value: string) => {
    setUserInputs((prev) => ({
      ...prev,
      [index]: value,
    }));
    setVerificationError('');
  };

  // Split mnemonic into groups of 4 words
  const wordGroups = splitMnemonicIntoGroups(mnemonic, 4);

  return (
    <div className="max-w-2xl mx-auto">
      {step === 'display' ? (
        // Step 1: Display seed phrase
        <Card className="border-2 border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Backup Your Seed Phrase
            </CardTitle>
            <CardDescription>
              This is the ONLY time your seed phrase will be shown. Write it down and keep it safe.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Security warnings */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-red-900">CRITICAL SECURITY WARNINGS:</p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Write down these 12 words in order on paper</li>
                <li>Never share your seed phrase with anyone</li>
                <li>Never store it digitally (no screenshots, no cloud storage)</li>
                <li>If you lose it, your {chain} funds will be PERMANENTLY LOST</li>
                <li>Anyone with this phrase can steal your funds</li>
              </ul>
            </div>

            {/* Seed phrase display */}
            <div>
              <Label className="text-lg mb-3 block">Your 12-Word Seed Phrase:</Label>
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 space-y-4">
                {wordGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="grid grid-cols-4 gap-3">
                    {group.map((wordObj) => (
                      <div key={wordObj.index} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{wordObj.index}</div>
                        <div className="bg-white border border-gray-300 rounded px-3 py-2 font-mono font-semibold">
                          {wordObj.word}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Copy button */}
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </Button>
              </div>

              <p className="text-xs text-gray-600 mt-2 text-center">
                Pro tip: Use a fireproof safe or bank safety deposit box
              </p>
            </div>

            {/* Confirmation checklist */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-semibold mb-2">Before proceeding, confirm you have:</p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span>📝</span>
                  <span>Written down all 12 words in the correct order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✏️</span>
                  <span>Double-checked each word for accuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🔒</span>
                  <span>Stored the paper in a secure location</span>
                </li>
              </ul>
            </div>
          </CardContent>

          <CardFooter>
            <Button onClick={handleProceedToVerification} className="w-full" size="lg">
              I Have Written Down My Seed Phrase
            </Button>
          </CardFooter>
        </Card>
      ) : (
        // Step 2: Verify seed phrase
        <Card>
          <CardHeader>
            <CardTitle>Verify Your Backup</CardTitle>
            <CardDescription>
              Enter the requested words from your seed phrase to confirm you wrote it down correctly
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {verificationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{verificationError}</p>
              </div>
            )}

            <div className="space-y-4">
              {verificationWords.map((wordObj) => (
                <div key={wordObj.index} className="space-y-2">
                  <Label htmlFor={`word-${wordObj.index}`}>
                    Word #{wordObj.index} (of 12)
                  </Label>
                  <Input
                    id={`word-${wordObj.index}`}
                    type="text"
                    placeholder="Enter the word"
                    value={userInputs[wordObj.index] || ''}
                    onChange={(e) => handleInputChange(wordObj.index, e.target.value)}
                    autoComplete="off"
                    className="font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 Check your written backup and enter the exact words as they appear
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('display')}
              className="flex-1"
            >
              Back to Seed Phrase
            </Button>
            <Button onClick={handleVerify} className="flex-1">
              Verify & Continue
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
