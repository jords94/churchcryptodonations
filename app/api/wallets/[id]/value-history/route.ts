/**
 * Wallet Value History API
 *
 * GET /api/wallets/[id]/value-history
 * Fetches historical balance data for charting wallet value over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/wallets/[id]/value-history
 * Fetch wallet value history for charts
 *
 * Query params:
 * - range: '24h' | '7d' | '30d' | '90d' | '1y' | 'all'
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
        balanceCrypto: true,
        balanceUsd: true,
        lastBalanceUpdate: true,
        createdAt: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission
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

    // 4. Get range parameter
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let granularity = 'HOURLY';

    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        granularity = 'HOURLY';
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        granularity = 'HOURLY';
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        granularity = 'DAILY';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        granularity = 'DAILY';
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        granularity = 'WEEKLY';
        break;
      case 'all':
        startDate = wallet.createdAt;
        granularity = 'MONTHLY';
        break;
    }

    // 5. Fetch value history
    const history = await prisma.walletValueHistory.findMany({
      where: {
        walletId: params.id,
        snapshotAt: {
          gte: startDate,
        },
        granularity,
      },
      orderBy: {
        snapshotAt: 'asc',
      },
      select: {
        balanceCrypto: true,
        balanceUsd: true,
        cryptoPrice: true,
        snapshotAt: true,
      },
    });

    // 6. If no history exists, create synthetic data point with current balance
    if (history.length === 0) {
      // Return current balance as single data point
      return NextResponse.json({
        success: true,
        wallet: {
          id: wallet.id,
          chain: wallet.chain,
          address: wallet.address,
        },
        range,
        history: [
          {
            balanceCrypto: wallet.balanceCrypto,
            balanceUsd: wallet.balanceUsd,
            cryptoPrice: '0',
            snapshotAt: wallet.lastBalanceUpdate || wallet.createdAt,
          },
        ],
        note: 'No historical data available yet. History will build up over time.',
      });
    }

    // 7. Add current balance as most recent data point if needed
    const latestSnapshot = history[history.length - 1];
    const latestSnapshotTime = new Date(latestSnapshot.snapshotAt).getTime();
    const timeSinceLastSnapshot = now.getTime() - latestSnapshotTime;

    // If last snapshot is more than 1 hour old, add current balance
    if (timeSinceLastSnapshot > 60 * 60 * 1000) {
      history.push({
        balanceCrypto: wallet.balanceCrypto,
        balanceUsd: wallet.balanceUsd,
        cryptoPrice: '0',
        snapshotAt: wallet.lastBalanceUpdate || now,
      });
    }

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        chain: wallet.chain,
        address: wallet.address,
      },
      range,
      history,
    });
  } catch (error) {
    console.error('Error in GET /api/wallets/[id]/value-history:', error);

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
