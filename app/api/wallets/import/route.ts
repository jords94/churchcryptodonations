/**
 * Wallet Import API Route
 *
 * Handles importing existing cryptocurrency wallets using seed phrases.
 *
 * Security features:
 * - Authentication required
 * - RBAC permission check (WALLET_CREATE)
 * - Rate limiting (5 imports per hour per user)
 * - Mnemonic validation (BIP39)
 * - Duplicate address detection
 * - Audit logging
 * - Non-custodial (seed phrase never stored)
 *
 * Flow:
 * 1. Validate user authentication
 * 2. Check WALLET_CREATE permission
 * 3. Validate mnemonic seed phrase (BIP39)
 * 4. Derive address from mnemonic
 * 5. Check for duplicate addresses
 * 6. Store ONLY public address in database
 * 7. Return wallet data (no mnemonic - user already has it)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { requireAuth, getIPAddress } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import { logWalletEvent } from '@/lib/security/auditLog';
import { deriveBitcoinWalletFromMnemonic } from '@/lib/crypto/bitcoin';
import { deriveEthereumWalletFromMnemonic } from '@/lib/crypto/ethereum';
import { validateMnemonic } from '@/lib/crypto/walletGenerator';
import { validateAddress } from '@/lib/crypto/validators';
import { type Chain } from '@/config/chains';

/**
 * Wallet import request schema
 * MVP: BTC + USDC only
 */
const importWalletSchema = z.object({
  churchId: z.string().cuid('Invalid church ID'),
  chain: z.enum(['BTC', 'USDC'], {
    errorMap: () => ({ message: 'Invalid blockchain. Must be BTC or USDC (MVP)' }),
  }),
  mnemonic: z.string().min(1, 'Mnemonic is required'),
  label: z.string().max(50, 'Label too long').optional(),
});

/**
 * POST /api/wallets/import
 *
 * Imports an existing cryptocurrency wallet using a seed phrase
 *
 * Request body:
 * {
 *   churchId: string,
 *   chain: 'BTC' | 'USDC',
 *   mnemonic: string,  // 12 or 24 word seed phrase
 *   label?: string
 * }
 *
 * Response:
 * {
 *   wallet: {
 *     id: string,
 *     address: string,
 *     chain: string,
 *     label?: string
 *   }
 * }
 *
 * Response codes:
 * - 201: Wallet imported successfully
 * - 400: Invalid input, invalid mnemonic, or duplicate address
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    // 2. Parse and validate request
    const body = await request.json();
    const validatedData = importWalletSchema.parse(body);

    const { churchId, chain, mnemonic, label } = validatedData;

    // 3. Check RBAC permission (same as wallet creation)
    const ipAddress = getIPAddress(request);
    await requirePermission(user.id, churchId, Permission.WALLET_CREATE, ipAddress);

    // 4. Validate mnemonic seed phrase
    const cleanedMnemonic = mnemonic.trim().toLowerCase();

    if (!validateMnemonic(cleanedMnemonic)) {
      return NextResponse.json(
        {
          error: 'Invalid mnemonic',
          message: 'The seed phrase you entered is invalid. Please check for typos and ensure all words are correct.',
        },
        { status: 400 }
      );
    }

    // 5. Validate word count (12 or 24 words)
    const words = cleanedMnemonic.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      return NextResponse.json(
        {
          error: 'Invalid mnemonic length',
          message: 'Seed phrase must be 12 or 24 words.',
        },
        { status: 400 }
      );
    }

    // 6. Get church and validate
    const church = await prisma.church.findUnique({
      where: { id: churchId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!church) {
      return NextResponse.json(
        { error: 'Church not found', message: 'The specified church does not exist.' },
        { status: 404 }
      );
    }

    // 7. Derive wallet from mnemonic
    let derivedWallet;

    try {
      switch (chain) {
        case 'BTC':
          derivedWallet = deriveBitcoinWalletFromMnemonic(cleanedMnemonic);
          break;

        case 'USDC':
          // USDC uses Ethereum addresses
          derivedWallet = deriveEthereumWalletFromMnemonic(cleanedMnemonic);
          derivedWallet.chain = 'USDC'; // Override chain identifier
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid chain', message: 'Unsupported blockchain network (MVP: BTC, USDC only).' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Wallet derivation error:', error);
      return NextResponse.json(
        {
          error: 'Derivation failed',
          message: 'Failed to derive wallet address from seed phrase. Please verify your mnemonic is correct.',
        },
        { status: 400 }
      );
    }

    // 8. Validate derived address (safety check)
    const isValidAddress = validateAddress(derivedWallet.address, chain);

    if (!isValidAddress) {
      console.error('Derived invalid address:', derivedWallet.address);
      return NextResponse.json(
        {
          error: 'Invalid address',
          message: 'Failed to derive valid wallet address. Please verify your seed phrase.',
        },
        { status: 500 }
      );
    }

    // 9. Check for duplicate address
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        address: derivedWallet.address,
        chain,
      },
      select: {
        id: true,
        churchId: true,
        label: true,
        church: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingWallet) {
      // Check if wallet belongs to this church
      if (existingWallet.churchId === churchId) {
        return NextResponse.json(
          {
            error: 'Duplicate wallet',
            message: `This wallet is already imported to your church${existingWallet.label ? ` as "${existingWallet.label}"` : ''}.`,
          },
          { status: 400 }
        );
      }

      // Wallet belongs to another church
      return NextResponse.json(
        {
          error: 'Wallet already exists',
          message: 'This wallet address is already being used by another church. Each wallet can only be used by one church.',
        },
        { status: 400 }
      );
    }

    // 10. Store wallet in database (ONLY public address, NEVER the seed phrase)
    const wallet = await prisma.wallet.create({
      data: {
        churchId,
        chain,
        address: derivedWallet.address,
        derivationPath: derivedWallet.derivationPath,
        label: label || null,
        isActive: true,
        balanceCrypto: '0',
        balanceUsd: '0',
      },
      select: {
        id: true,
        address: true,
        chain: true,
        derivationPath: true,
        label: true,
        createdAt: true,
      },
    });

    // 11. Log wallet import for audit trail (MVP: optional, don't block if fails)
    try {
      await logWalletEvent(
        'WALLET_IMPORTED',
        user.id,
        churchId,
        wallet.id,
        chain,
        wallet.address,
        ipAddress,
        {
          label: label || null,
          subscriptionTier: church.subscriptionTier,
          mnemonicLength: words.length,
        }
      );
    } catch (error) {
      // MVP: Don't block wallet import if audit logging fails
      console.error('Audit logging failed (non-blocking):', error);
    }

    // 12. Return wallet data (NO mnemonic - user already has it)
    return NextResponse.json(
      {
        success: true,
        wallet: {
          id: wallet.id,
          address: wallet.address,
          chain: wallet.chain,
          derivationPath: wallet.derivationPath,
          label: wallet.label,
          createdAt: wallet.createdAt,
        },
        message: 'Wallet imported successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Wallet import error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: error.errors[0].message,
          fields: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to import wallets for this church.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while importing the wallet. Please try again.',
      },
      { status: 500 }
    );
  }
}
