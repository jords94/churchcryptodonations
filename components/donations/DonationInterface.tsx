/**
 * Donation Interface Component
 *
 * Main UI for accepting cryptocurrency donations.
 *
 * Features:
 * - QR code display
 * - Wallet address with copy button
 * - Suggested amount display
 * - Manual donation instructions
 * - "Open in Wallet" button for mobile
 * - Confirmation tracking
 *
 * This component is used on the public donation landing page.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay';
import { CHAIN_CONFIG, type Chain } from '@/config/chains';
import { generatePaymentURI } from '@/lib/qrcode/generator';

/**
 * Component props
 */
interface DonationInterfaceProps {
  qrCodeId: string;
  address: string;
  chain: Chain;
  churchName: string;
  campaignName: string;
  suggestedAmount?: string;
  customMessage?: string;
  foregroundColor: string;
  backgroundColor: string;
  logoUrl?: string;
}

/**
 * Donation interface component
 */
export function DonationInterface({
  qrCodeId,
  address,
  chain,
  churchName,
  campaignName,
  suggestedAmount,
  customMessage,
  foregroundColor,
  backgroundColor,
  logoUrl,
}: DonationInterfaceProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const chainConfig = CHAIN_CONFIG[chain];

  /**
   * Copy address to clipboard
   */
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy address');
    }
  };

  /**
   * Open in wallet app (mobile deep linking)
   *
   * Generates a payment URI that wallet apps can handle.
   */
  const handleOpenInWallet = () => {
    const paymentURI = generatePaymentURI({
      address,
      chain,
      amount: suggestedAmount,
      label: `${churchName} - ${campaignName}`,
      message: customMessage,
    });

    // Open the payment URI (wallet apps will intercept)
    window.location.href = paymentURI;
  };

  /**
   * Track donation confirmation
   *
   * When user confirms they've sent the donation, we can track it
   * and redirect them to a thank you page.
   */
  const handleConfirmDonation = () => {
    // In a real implementation, you might want to collect:
    // - Transaction hash (optional)
    // - Donor email (optional)
    // - Amount sent

    // For now, just redirect to thank you page
    router.push(`/donate/${qrCodeId}/thank-you`);
  };

  return (
    <div className="space-y-6">
      {/* Main Donation Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-center">Send Your Donation</CardTitle>
          <CardDescription className="text-center">
            Scan the QR code or copy the address below
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <QRCodeDisplay
              address={address}
              chain={chain}
              amount={suggestedAmount}
              label={`${churchName} - ${campaignName}`}
              message={customMessage}
              size={280}
              backgroundColor={backgroundColor}
              foregroundColor={foregroundColor}
              logoUrl={logoUrl}
              showDownload={true}
              showCopy={false}
              errorCorrectionLevel={logoUrl ? 'H' : 'M'}
            />
          </div>

          {/* Suggested Amount */}
          {suggestedAmount && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-600 mb-1">Suggested Donation Amount</div>
              <div className="text-3xl font-bold text-primary">
                {suggestedAmount} {chain === 'USDC' ? 'USDC' : chainConfig.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                You can send any amount you wish
              </div>
            </div>
          )}

          {/* Wallet Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Wallet Address</label>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{chainConfig.icon}</span>
                <span>{chainConfig.name}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 border border-gray-300 rounded-lg p-3 font-mono text-sm break-all">
                {address}
              </div>
              <Button variant="outline" onClick={handleCopyAddress} className="shrink-0">
                {copied ? '✓ Copied' : '📋 Copy'}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleOpenInWallet} size="lg" className="w-full">
              📱 Open in Wallet App
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowInstructions(!showInstructions)}
              size="lg"
              className="w-full"
            >
              📖 {showInstructions ? 'Hide' : 'Show'} Instructions
            </Button>
          </div>

          {/* Instructions (expandable) */}
          {showInstructions && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">How to Send {chainConfig.name}:</h3>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Open your {chainConfig.name} wallet app</li>
                <li>Tap "Send" or "Transfer"</li>
                <li>
                  Scan the QR code above OR paste the wallet address:
                  <div className="bg-white border rounded p-2 mt-1 font-mono text-xs break-all">
                    {address}
                  </div>
                </li>
                {suggestedAmount && (
                  <li>
                    Enter the amount: {suggestedAmount} {chain === 'USDC' ? 'USDC' : chainConfig.name}
                    {' '}(or any amount)
                  </li>
                )}
                <li>Review the transaction details carefully</li>
                <li>Confirm and send the transaction</li>
                <li>Wait for blockchain confirmation ({chainConfig.confirmations} confirmations)</li>
              </ol>

              {/* Chain-specific notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                <p className="text-xs font-semibold mb-1">⚠️ Important Notes:</p>
                <ul className="text-xs space-y-1">
                  {chain === 'BTC' && (
                    <>
                      <li>• Only send Bitcoin (BTC) to this address</li>
                      <li>• Transactions typically take 10-60 minutes to confirm</li>
                      <li>• Network fees vary based on congestion</li>
                    </>
                  )}
                  {(chain === 'ETH' || chain === 'USDC') && (
                    <>
                      <li>
                        • Only send {chain === 'USDC' ? 'USDC (ERC-20)' : 'Ethereum (ETH)'} to this
                        address
                      </li>
                      <li>• Gas fees can be high during network congestion</li>
                      <li>• Transactions typically confirm in 1-5 minutes</li>
                    </>
                  )}
                  {chain === 'XRP' && (
                    <>
                      <li>• Only send XRP to this address</li>
                      <li>• No destination tag required</li>
                      <li>• Transactions typically confirm in 3-5 seconds</li>
                      <li>• The wallet must have a minimum 10 XRP balance to be active</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleConfirmDonation}
            variant="outline"
            className="w-full"
            size="lg"
          >
            I've Sent My Donation →
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Click above after sending to see your donation confirmation
          </p>
        </CardFooter>
      </Card>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              <span className="font-semibold">{chainConfig.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmations:</span>
              <span className="font-semibold">{chainConfig.confirmations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg. Block Time:</span>
              <span className="font-semibold">~{Math.round(chainConfig.blockTime / 60)}min</span>
            </div>
          </CardContent>
        </Card>

        {/* Explorer Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Track Your Donation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-gray-600">
              View all transactions to this wallet on the blockchain explorer:
            </p>
            <a
              href={`${chainConfig.blockExplorer}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
            >
              View on {chainConfig.name} Explorer →
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-800">
            <strong>⚠️ Security Reminder:</strong> Always verify you're on the correct donation page
            before sending cryptocurrency. Crypto transactions are irreversible. Only send{' '}
            {chainConfig.name} to this address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
