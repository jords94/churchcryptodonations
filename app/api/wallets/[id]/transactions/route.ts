/**
 * Wallet Transactions API
 *
 * GET /api/wallets/[id]/transactions
 * Fetches transaction history for a specific wallet from the blockchain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletTransactionHistory } from '@/lib/blockchain/balanceMonitor';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/wallets/[id]/transactions
 * Fetch transaction history for a wallet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    // 2. Fetch wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        churchId: true,
        chain: true,
        address: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission for this church
    try {
      await requirePermission(
        user.id,
        wallet.churchId,
        Permission.WALLET_VIEW,
        request.headers.get('x-forwarded-for') || 'unknown'
      );
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have permission to view this wallet' },
        { status: 403 }
      );
    }

    // 4. Fetch transaction history from blockchain
    const result = await getWalletTransactionHistory(params.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        chain: wallet.chain,
        address: wallet.address,
      },
      transactions: result.transactions,
    });
  } catch (error) {
    console.error('Error in GET /api/wallets/[id]/transactions:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
