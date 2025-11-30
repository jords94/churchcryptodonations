/**
 * QR Code Customizer Component
 *
 * Interactive form for creating and customizing QR codes.
 *
 * Features:
 * - Select wallet and chain
 * - Set suggested donation amounts
 * - Customize colors and branding
 * - Add campaign labels
 * - Preview QR code in real-time
 * - Save QR code configuration
 *
 * Used in dashboard for churches to create shareable QR codes.
 */

'use client';

import { useState, useEffect } from 'react';
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
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay';
import { CHAIN_CONFIG, type Chain } from '@/config/chains';

/**
 * Wallet option for selection
 */
interface WalletOption {
  id: string;
  address: string;
  chain: Chain;
  label: string | null;
}

/**
 * Component props
 */
interface QRCodeCustomizerProps {
  wallets: WalletOption[]; // Available wallets to choose from
  churchName: string; // Church name for default label
  churchLogoUrl?: string; // Optional church logo
  onSave?: (qrCodeConfig: QRCodeConfig) => void; // Callback when QR code is saved
  initialConfig?: Partial<QRCodeConfig>; // For editing existing QR codes
}

/**
 * QR code configuration
 */
export interface QRCodeConfig {
  walletId: string;
  address: string;
  chain: Chain;
  campaignName: string; // e.g., "Sunday Offerings", "Building Fund"
  suggestedAmount?: string;
  customMessage?: string;
  foregroundColor: string;
  backgroundColor: string;
  includeLogo: boolean;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

/**
 * QR Code customizer component
 */
export function QRCodeCustomizer({
  wallets,
  churchName,
  churchLogoUrl,
  onSave,
  initialConfig,
}: QRCodeCustomizerProps) {
  // Form state
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    initialConfig?.walletId || (wallets.length > 0 ? wallets[0].id : '')
  );
  const [campaignName, setCampaignName] = useState(
    initialConfig?.campaignName || 'General Donations'
  );
  const [suggestedAmount, setSuggestedAmount] = useState(initialConfig?.suggestedAmount || '');
  const [customMessage, setCustomMessage] = useState(initialConfig?.customMessage || '');
  const [foregroundColor, setForegroundColor] = useState(
    initialConfig?.foregroundColor || '#000000'
  );
  const [backgroundColor, setBackgroundColor] = useState(
    initialConfig?.backgroundColor || '#FFFFFF'
  );
  const [includeLogo, setIncludeLogo] = useState(initialConfig?.includeLogo ?? true);
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>(
    initialConfig?.errorCorrectionLevel || 'M'
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // Get selected wallet
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  /**
   * Handle save QR code configuration
   */
  const handleSave = async () => {
    setError('');

    // Validate
    if (!selectedWallet) {
      setError('Please select a wallet');
      return;
    }

    if (!campaignName.trim()) {
      setError('Please enter a campaign name');
      return;
    }

    if (suggestedAmount && (isNaN(parseFloat(suggestedAmount)) || parseFloat(suggestedAmount) <= 0)) {
      setError('Suggested amount must be a positive number');
      return;
    }

    // Create config object
    const config: QRCodeConfig = {
      walletId: selectedWallet.id,
      address: selectedWallet.address,
      chain: selectedWallet.chain,
      campaignName: campaignName.trim(),
      suggestedAmount: suggestedAmount || undefined,
      customMessage: customMessage.trim() || undefined,
      foregroundColor,
      backgroundColor,
      includeLogo,
      errorCorrectionLevel,
    };

    setIsSaving(true);

    try {
      // Call parent save handler
      if (onSave) {
        await onSave(config);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save QR code');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Reset to default colors
   */
  const handleResetColors = () => {
    setForegroundColor('#000000');
    setBackgroundColor('#FFFFFF');
  };

  /**
   * Preset color schemes
   */
  const colorPresets = [
    { name: 'Classic', fg: '#000000', bg: '#FFFFFF' },
    { name: 'Blue', fg: '#1E40AF', bg: '#EFF6FF' },
    { name: 'Green', fg: '#166534', bg: '#F0FDF4' },
    { name: 'Purple', fg: '#6B21A8', bg: '#FAF5FF' },
    { name: 'Red', fg: '#991B1B', bg: '#FEF2F2' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Customize QR Code</CardTitle>
          <CardDescription>
            Create a shareable QR code for your donation campaign
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Wallet Selection */}
          <div className="space-y-2">
            <Label htmlFor="wallet">Select Wallet</Label>
            <select
              id="wallet"
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {CHAIN_CONFIG[wallet.chain].icon} {CHAIN_CONFIG[wallet.chain].name} -{' '}
                  {wallet.label || wallet.address.slice(0, 12)}...
                </option>
              ))}
            </select>
            {selectedWallet && (
              <p className="text-xs text-gray-500">
                Address: {selectedWallet.address}
              </p>
            )}
          </div>

          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign">Campaign Name *</Label>
            <Input
              id="campaign"
              type="text"
              placeholder="e.g., Sunday Offerings, Building Fund, Mission Trip"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-gray-500">
              This will be displayed below the QR code
            </p>
          </div>

          {/* Suggested Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Suggested Amount (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={suggestedAmount}
                onChange={(e) => setSuggestedAmount(e.target.value)}
              />
              <div className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-md min-w-[80px] justify-center">
                {selectedWallet ? (
                  selectedWallet.chain === 'USDC' ? 'USDC' : CHAIN_CONFIG[selectedWallet.chain].name
                ) : (
                  '-'
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Pre-fill donation amount (donors can change this)
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Input
              id="message"
              type="text"
              placeholder="e.g., Thank you for your generous support!"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-gray-500">
              A short message to donors (max 100 characters)
            </p>
          </div>

          {/* Color Customization */}
          <div className="space-y-3">
            <Label>Colors</Label>

            {/* Color presets */}
            <div className="flex gap-2 flex-wrap">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setForegroundColor(preset.fg);
                    setBackgroundColor(preset.bg);
                  }}
                  className="px-3 py-1 text-xs rounded border border-gray-300 hover:border-gray-400 transition-colors"
                  style={{
                    backgroundColor: preset.bg,
                    color: preset.fg,
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Custom colors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fg-color" className="text-xs">
                  QR Code Color
                </Label>
                <div className="flex gap-2">
                  <input
                    id="fg-color"
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bg-color" className="text-xs">
                  Background Color
                </Label>
                <div className="flex gap-2">
                  <input
                    id="bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleResetColors}>
              Reset to Default Colors
            </Button>
          </div>

          {/* Logo Option */}
          {churchLogoUrl && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="logo"
                checked={includeLogo}
                onChange={(e) => {
                  setIncludeLogo(e.target.checked);
                  // If enabling logo, increase error correction
                  if (e.target.checked && errorCorrectionLevel === 'L') {
                    setErrorCorrectionLevel('H');
                  }
                }}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="logo" className="cursor-pointer">
                Include church logo in QR code
              </Label>
            </div>
          )}

          {/* Error Correction */}
          <div className="space-y-2">
            <Label htmlFor="error-correction">Error Correction Level</Label>
            <select
              id="error-correction"
              value={errorCorrectionLevel}
              onChange={(e) => setErrorCorrectionLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={includeLogo} // Force H when logo is enabled
            >
              <option value="L">Low (7% recovery) - Smallest size</option>
              <option value="M">Medium (15% recovery) - Recommended</option>
              <option value="Q">Quartile (25% recovery)</option>
              <option value="H">High (30% recovery) - Required for logos</option>
            </select>
            {includeLogo && (
              <p className="text-xs text-gray-500">
                High error correction is required when including a logo
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={handleSave} disabled={isSaving || !selectedWallet} className="w-full">
            {isSaving ? 'Saving...' : 'Save QR Code'}
          </Button>
        </CardFooter>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your QR code will look</CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-center py-8">
          {selectedWallet ? (
            <QRCodeDisplay
              address={selectedWallet.address}
              chain={selectedWallet.chain}
              amount={suggestedAmount || undefined}
              label={`${churchName} - ${campaignName}`}
              message={customMessage || undefined}
              size={256}
              backgroundColor={backgroundColor}
              foregroundColor={foregroundColor}
              errorCorrectionLevel={errorCorrectionLevel}
              includeMargin={true}
              logoUrl={includeLogo ? churchLogoUrl : undefined}
              showDownload={false}
              showCopy={false}
            />
          ) : (
            <div className="text-center text-gray-500">
              <p>Select a wallet to preview QR code</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="text-xs text-gray-500 text-center">
          Your donors can scan this code with their crypto wallet app
        </CardFooter>
      </Card>
    </div>
  );
}
