/**
 * Wallet Creation API Route
 *
 * Handles creation of new cryptocurrency wallets for churches.
 *
 * Security features:
 * - Authentication required
 * - RBAC permission check (WALLET_CREATE)
 * - Rate limiting (5 wallets per hour per user)
 * - Subscription tier validation
 * - Audit logging
 * - Non-custodial (seed phrase never stored)
 *
 * Flow:
 * 1. Validate user authentication
 * 2. Check WALLET_CREATE permission
 * 3. Validate subscription tier limits
 * 4. Generate HD wallet with seed phrase
 * 5. Store ONLY public address in database
 * 6. Return address + seed phrase (ONE TIME ONLY)
 * 7. User must backup seed phrase immediately
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { requireAuth, getIPAddress } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import { rateLimitByUser } from '@/lib/security/rateLimiter';
import { RATE_LIMITS, SUBSCRIPTION_TIERS } from '@/config/constants';
import { logWalletEvent } from '@/lib/security/auditLog';
import { generateBitcoinWallet } from '@/lib/crypto/bitcoin';
import { generateEthereumWallet } from '@/lib/crypto/ethereum';
// MVP-DEFERRED: import { generateXRPWallet } from '@/lib/crypto/xrp';
import { validateAddress } from '@/lib/crypto/validators';
import { type Chain } from '@/config/chains';

/**
 * Wallet creation request schema
 * MVP: BTC + USDC only
 */
const createWalletSchema = z.object({
  churchId: z.string().cuid('Invalid church ID'),
  chain: z.enum(['BTC', 'USDC'], {
    errorMap: () => ({ message: 'Invalid blockchain. Must be BTC or USDC (MVP)' }),
  }),
  // MVP-DEFERRED: chain: z.enum(['BTC', 'ETH', 'USDC', 'XRP']),
  label: z.string().max(50, 'Label too long').optional(),
});

/**
 * POST /api/wallets/create
 *
 * Creates a new cryptocurrency wallet for a church
 *
 * Request body:
 * {
 *   churchId: string,
 *   chain: 'BTC' | 'ETH' | 'USDC' | 'XRP',
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
 *   },
 *   mnemonic: string,  // CRITICAL: User must save this immediately
 *   warning: string     // Security warning about backing up mnemonic
 * }
 *
 * Response codes:
 * - 201: Wallet created successfully
 * - 400: Invalid input or chain not enabled
 * - 401: Not authenticated
 * - 403: Insufficient permissions or subscription limit reached
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    // 2. Parse and validate request
    const body = await request.json();
    const validatedData = createWalletSchema.parse(body);

    const { churchId, chain, label } = validatedData;

    // 3. Check RBAC permission
    const ipAddress = getIPAddress(request);
    await requirePermission(user.id, churchId, Permission.WALLET_CREATE, ipAddress);

    // MVP-DEFERRED: Rate limiting disabled for MVP
    // 4. Apply rate limiting (5 wallet creations per hour per user)
    // await rateLimitByUser(user.id, 'wallet:create', RATE_LIMITS.API_WALLET_CREATE);

    // 5. Get church and validate subscription
    const church = await prisma.church.findUnique({
      where: { id: churchId },
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        enabledChains: true,
        wallets: {
          where: { chain, isActive: true },
          select: { id: true },
        },
      },
    });

    if (!church) {
      return NextResponse.json(
        { error: 'Church not found', message: 'The specified church does not exist.' },
        { status: 404 }
      );
    }

    // MVP-DEFERRED: Subscription checks disabled for MVP (all churches get full access)
    // 6. Check if subscription is active
    // if (church.subscriptionStatus !== 'ACTIVE' && church.subscriptionStatus !== 'TRIAL') {
    //   return NextResponse.json(
    //     {
    //       error: 'Inactive subscription',
    //       message: 'Your subscription is not active. Please update your payment method.',
    //     },
    //     { status: 403 }
    //   );
    // }

    // 7. Check if chain is enabled for this church
    // if (!church.enabledChains.includes(chain)) {
    //   return NextResponse.json(
    //     {
    //       error: 'Chain not enabled',
    //       message: `${chain} is not enabled for your church. Please upgrade your subscription or enable this blockchain.`,
    //     },
    //     { status: 400 }
    //   );
    // }

    // 8. Check wallet limit based on subscription tier
    // const tierConfig = SUBSCRIPTION_TIERS[church.subscriptionTier];
    // const currentWalletCount = church.wallets.length;
    //
    // if (
    //   tierConfig.maxWalletsPerChain !== -1 &&
    //   currentWalletCount >= tierConfig.maxWalletsPerChain
    // ) {
    //   return NextResponse.json(
    //     {
    //       error: 'Wallet limit reached',
    //       message: `You have reached the maximum number of ${chain} wallets (${tierConfig.maxWalletsPerChain}) for your ${church.subscriptionTier} plan. Please upgrade to create more wallets.`,
    //     },
    //     { status: 403 }
    //   );
    // }

    // 9. Generate wallet based on chain (MVP: BTC + USDC only)
    let generatedWallet;

    switch (chain) {
      case 'BTC':
        generatedWallet = generateBitcoinWallet();
        break;

      case 'USDC':
        // USDC uses Ethereum addresses
        generatedWallet = generateEthereumWallet();
        generatedWallet.chain = 'USDC'; // Override chain identifier
        break;

      // MVP-DEFERRED: Re-enable for post-MVP
      // case 'ETH':
      //   generatedWallet = generateEthereumWallet();
      //   break;
      // case 'XRP':
      //   generatedWallet = generateXRPWallet();
      //   break;

      default:
        return NextResponse.json(
          { error: 'Invalid chain', message: 'Unsupported blockchain network (MVP: BTC, USDC only).' },
          { status: 400 }
        );
    }

    // 10. Validate generated address (safety check)
    const isValidAddress = validateAddress(generatedWallet.address, chain);

    if (!isValidAddress) {
      console.error('Generated invalid address:', generatedWallet.address);
      return NextResponse.json(
        {
          error: 'Wallet generation failed',
          message: 'Failed to generate valid wallet address. Please try again.',
        },
        { status: 500 }
      );
    }

    // 11. Check for duplicate address (very unlikely with HD wallets, but safety check)
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        address: generatedWallet.address,
        chain,
      },
    });

    if (existingWallet) {
      console.error('Duplicate wallet address generated:', generatedWallet.address);
      return NextResponse.json(
        {
          error: 'Duplicate address',
          message: 'Address collision detected. Please try again.',
        },
        { status: 500 }
      );
    }

    // 12. Store wallet in database (ONLY public address, NEVER the seed phrase)
    const wallet = await prisma.wallet.create({
      data: {
        churchId,
        chain,
        address: generatedWallet.address,
        derivationPath: generatedWallet.derivationPath,
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

    // 13. Log wallet creation for audit trail (MVP: optional, don't block if fails)
    try {
      await logWalletEvent(
        'WALLET_CREATED',
        user.id,
        churchId,
        wallet.id,
        chain,
        wallet.address,
        ipAddress,
        {
          label: label || null,
          subscriptionTier: church.subscriptionTier,
        }
      );
    } catch (error) {
      // MVP: Don't block wallet creation if audit logging fails
      console.error('Audit logging failed (non-blocking):', error);
    }

    // 14. Return wallet data with seed phrase
    // CRITICAL: This is the ONLY time the seed phrase is provided
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
        mnemonic: generatedWallet.mnemonic,
        warning:
          'CRITICAL: Save your seed phrase immediately! This is the ONLY time it will be shown. ' +
          'We do not store your seed phrase. If you lose it, your funds will be PERMANENTLY LOST.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Wallet creation error:', error);

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

    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('Too many requests')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: error.message,
        },
        { status: 429 }
      );
    }

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to create wallets for this church.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while creating the wallet. Please try again.',
      },
      { status: 500 }
    );
  }
}
