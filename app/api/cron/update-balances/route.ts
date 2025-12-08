/**
 * Balance Update Cron Job API Endpoint
 *
 * This endpoint is called by a cron job to update all wallet balances.
 * Can be triggered by:
 * - Vercel Cron Jobs (in vercel.json)
 * - GitHub Actions
 * - External cron service (e.g., cron-job.org)
 * - Manual trigger
 *
 * Security:
 * - Requires CRON_SECRET environment variable
 * - Must pass secret in Authorization header
 *
 * Usage:
 * curl -X GET http://localhost:3000/api/cron/update-balances \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateAllWalletBalances } from '@/lib/blockchain/balanceMonitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel: max 60 seconds for cron jobs

/**
 * GET /api/cron/update-balances
 *
 * Updates all active wallet balances
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron jobs not configured' },
        { status: 500 }
      );
    }

    const expectedAuth = `Bearer ${cronSecret}`;

    if (authHeader !== expectedAuth) {
      console.error('Invalid cron secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting scheduled balance update...');

    // 2. Update all wallet balances
    const result = await updateAllWalletBalances();

    // 3. Return results
    const response = {
      success: result.success,
      timestamp: new Date().toISOString(),
      stats: {
        totalWallets: result.totalWallets,
        updated: result.totalUpdated,
        failed: result.totalFailed,
        duration: `${(result.duration / 1000).toFixed(2)}s`,
      },
    };

    console.log('Balance update completed:', response);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Cron job error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
