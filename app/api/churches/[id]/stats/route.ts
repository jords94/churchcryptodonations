/**
 * Church Stats API Route
 *
 * GET /api/churches/:id/stats
 *
 * Returns dashboard statistics for a church including:
 * - Total balance (USD)
 * - Active wallet count
 * - Total donations count
 * - List of all wallets with balances
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';
import { requireChurchOwnership } from '@/lib/auth/session';

/**
 * GET /api/churches/:id/stats
 *
 * Fetch church dashboard statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    const churchId = params.id;

    // 2. Verify user belongs to this church
    await requireChurchOwnership(user.id, churchId);

    // 3. Fetch all wallets for this church
    const wallets = await prisma.wallet.findMany({
      where: {
        churchId,
        isActive: true,
      },
      select: {
        id: true,
        chain: true,
        address: true,
        label: true,
        balanceCrypto: true,
        balanceUsd: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 4. Calculate totals
    const totalBalanceUsd = wallets.reduce((sum, wallet) => {
      return sum + parseFloat(wallet.balanceUsd);
    }, 0);

    const activeWalletCount = wallets.length;

    // MVP: Transaction count not implemented yet
    const totalDonations = 0;

    // 5. Return stats
    return NextResponse.json({
      totalBalanceUsd,
      activeWalletCount,
      totalDonations,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        chain: wallet.chain,
        label: wallet.label,
        address: wallet.address,
        balanceCrypto: wallet.balanceCrypto,
        balanceUsd: wallet.balanceUsd,
        isActive: wallet.isActive,
      })),
    });
  } catch (error) {
    console.error('Fetch church stats error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Handle permission errors
    if (error instanceof Error && error.message.includes('do not have access')) {
      return NextResponse.json(
        { error: 'You do not have access to this church' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch church stats' },
      { status: 500 }
    );
  }
}
