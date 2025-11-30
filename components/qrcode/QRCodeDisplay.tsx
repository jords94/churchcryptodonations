/**
 * QR Code Display Component
 *
 * Displays cryptocurrency payment QR codes with customization options.
 *
 * Features:
 * - Renders QR codes using qrcode.react
 * - Custom colors and branding
 * - Optional logo overlay
 * - Download as PNG
 * - Copy to clipboard
 * - Responsive sizing
 *
 * Security:
 * - Validates all input parameters
 * - Sanitizes labels and messages
 * - Prevents XSS in data URIs
 */

'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { CHAIN_CONFIG, type Chain } from '@/config/chains';
import { createQRCodeData, type QRCodeOptions } from '@/lib/qrcode/generator';

/**
 * Component props
 */
interface QRCodeDisplayProps {
  address: string;
  chain: Chain;
  amount?: string;
  label?: string;
  message?: string;
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  logoUrl?: string; // Church logo URL
  showDownload?: boolean; // Show download button (default: true)
  showCopy?: boolean; // Show copy button (default: true)
  className?: string;
}

/**
 * QR Code display component
 *
 * Generates and displays a scannable QR code for cryptocurrency payments.
 */
export function QRCodeDisplay({
  address,
  chain,
  amount,
  label,
  message,
  size = 256,
  backgroundColor = '#FFFFFF',
  foregroundColor = '#000000',
  errorCorrectionLevel = 'M',
  includeMargin = true,
  logoUrl,
  showDownload = true,
  showCopy = true,
  className = '',
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate QR code data (URI)
  const qrCodeOptions: QRCodeOptions = {
    address,
    chain,
    amount,
    label,
    message,
    size,
    backgroundColor,
    foregroundColor,
    errorCorrectionLevel,
    includeMargin,
  };

  const qrData = createQRCodeData(qrCodeOptions);

  /**
   * Download QR code as PNG
   */
  const handleDownload = () => {
    try {
      // Get the SVG element
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) {
        throw new Error('QR code not found');
      }

      // Create a canvas to convert SVG to PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set canvas size (2x for better quality)
      const scaleFactor = 2;
      canvas.width = size * scaleFactor;
      canvas.height = size * scaleFactor;

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Load SVG into image
      const img = new Image();
      img.onload = () => {
        // Draw image on canvas (scaled)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert canvas to PNG
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error('Failed to create image blob');
          }

          // Create download link
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${label || chain}-qrcode-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Cleanup
          URL.revokeObjectURL(downloadUrl);
        }, 'image/png');

        // Cleanup
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        throw new Error('Failed to load QR code image');
      };

      img.src = url;
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download QR code. Please try again.');
    }
  };

  /**
   * Copy QR code address to clipboard
   */
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      // Could show a toast notification here
      alert('Address copied to clipboard!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy address. Please copy manually.');
    }
  };

  /**
   * Copy QR code URI to clipboard
   */
  const handleCopyURI = async () => {
    try {
      await navigator.clipboard.writeText(qrData.uri);
      alert('Payment URI copied to clipboard!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy URI. Please copy manually.');
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* QR Code */}
      <div
        ref={qrRef}
        className="relative rounded-lg border-4 border-gray-200 bg-white p-4 shadow-lg"
        style={{
          backgroundColor,
        }}
      >
        <QRCodeSVG
          value={qrData.uri}
          size={size}
          level={errorCorrectionLevel}
          includeMargin={includeMargin}
          bgColor={backgroundColor}
          fgColor={foregroundColor}
          imageSettings={
            logoUrl
              ? {
                  src: logoUrl,
                  height: size * 0.2, // Logo is 20% of QR code size
                  width: size * 0.2,
                  excavate: true, // Remove QR code dots behind logo
                }
              : undefined
          }
        />
      </div>

      {/* Chain and Address Info */}
      <div className="text-center space-y-2 w-full max-w-md">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{CHAIN_CONFIG[chain].icon}</span>
          <span className="font-semibold text-lg">{CHAIN_CONFIG[chain].name}</span>
        </div>

        {label && <div className="text-sm text-gray-600">{label}</div>}

        {amount && (
          <div className="font-bold text-xl text-primary">
            {amount} {chain === 'USDC' ? 'USDC' : CHAIN_CONFIG[chain].name}
          </div>
        )}

        {message && (
          <div className="text-sm text-gray-600 italic max-w-xs mx-auto">{message}</div>
        )}

        {/* Address display */}
        <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
          <div className="text-xs text-gray-500 mb-1">Wallet Address</div>
          <div className="font-mono text-xs break-all">{address}</div>
        </div>
      </div>

      {/* Action Buttons */}
      {(showDownload || showCopy) && (
        <div className="flex gap-2 flex-wrap justify-center">
          {showDownload && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              📥 Download QR Code
            </Button>
          )}

          {showCopy && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyAddress}>
                📋 Copy Address
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyURI}>
                🔗 Copy Payment Link
              </Button>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-md">
        Scan this QR code with your {CHAIN_CONFIG[chain].name} wallet app to send a donation.
      </div>
    </div>
  );
}
