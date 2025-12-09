/**
 * Wallet Value Tracking Cron Job
 *
 * Periodically snapshots wallet balances to build historical value data.
 * This powers the value-over-time charts in the wallet detail view.
 *
 * Usage:
 * - Run hourly: `node -e "require('./lib/cron/valueTracking').trackAllWalletValues()"`
 * - Or set up as a Vercel cron job
 */

import prisma from '@/lib/db/prisma';
import { getCryptoPrice } from '@/lib/blockchain/balanceMonitor';

/**
 * Track value for all active wallets
 * Creates hourly snapshots of wallet balances
 */
export async function trackAllWalletValues(): Promise<void> {
  console.log('📊 Starting wallet value tracking...');

  try {
    // Fetch all active wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        chain: true,
        balanceCrypto: true,
        balanceUsd: true,
        address: true,
      },
    });

    console.log(`Found ${wallets.length} active wallets to track`);

    let successCount = 0;
    let errorCount = 0;

    // Track each wallet
    for (const wallet of wallets) {
      try {
        await trackWalletValue(wallet.id);
        successCount++;
      } catch (error) {
        console.error(`Error tracking wallet ${wallet.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✓ Wallet value tracking complete: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    console.error('Error in value tracking cron job:', error);
    throw error;
  }
}

/**
 * Track value for a single wallet
 * Creates a snapshot with current balance and price
 */
export async function trackWalletValue(walletId: string): Promise<void> {
  try {
    // Fetch wallet
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        chain: true,
        balanceCrypto: true,
        balanceUsd: true,
      },
    });

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    // Get current crypto price
    let cryptoPrice = 0;
    try {
      if (wallet.chain === 'BTC') {
        cryptoPrice = await getCryptoPrice('bitcoin');
      } else if (wallet.chain === 'USDC') {
        cryptoPrice = await getCryptoPrice('usd-coin');
      }
    } catch (error) {
      console.warn(`Failed to get price for ${wallet.chain}, using 0`);
    }

    // Determine granularity (hourly by default)
    const granularity = 'HOURLY';

    // Check if we already have a snapshot for this hour
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);

    const existingSnapshot = await prisma.walletValueHistory.findFirst({
      where: {
        walletId,
        granularity,
        snapshotAt: {
          gte: hourStart,
        },
      },
    });

    if (existingSnapshot) {
      console.log(`Snapshot already exists for wallet ${walletId} this hour, skipping`);
      return;
    }

    // Create snapshot
    await prisma.walletValueHistory.create({
      data: {
        walletId,
        balanceCrypto: wallet.balanceCrypto,
        balanceUsd: wallet.balanceUsd,
        cryptoPrice: cryptoPrice.toString(),
        snapshotAt: now,
        granularity,
      },
    });

    console.log(`✓ Created value snapshot for wallet ${walletId}`);
  } catch (error) {
    console.error(`Error tracking wallet ${walletId}:`, error);
    throw error;
  }
}

/**
 * Aggregate hourly snapshots into daily/weekly/monthly snapshots
 * This reduces data volume for longer time ranges
 *
 * Run this daily to create daily aggregates,
 * weekly for weekly aggregates, etc.
 */
export async function aggregateSnapshots(): Promise<void> {
  console.log('📊 Starting snapshot aggregation...');

  try {
    // Get all active wallets
    const wallets = await prisma.wallet.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for (const wallet of wallets) {
      try {
        // Get hourly snapshots from yesterday
        const hourlySnapshots = await prisma.walletValueHistory.findMany({
          where: {
            walletId: wallet.id,
            granularity: 'HOURLY',
            snapshotAt: {
              gte: yesterday,
              lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          orderBy: {
            snapshotAt: 'asc',
          },
        });

        if (hourlySnapshots.length === 0) continue;

        // Take the median snapshot as the daily aggregate
        const medianIndex = Math.floor(hourlySnapshots.length / 2);
        const medianSnapshot = hourlySnapshots[medianIndex];

        // Check if daily snapshot already exists
        const existingDaily = await prisma.walletValueHistory.findFirst({
          where: {
            walletId: wallet.id,
            granularity: 'DAILY',
            snapshotAt: {
              gte: yesterday,
              lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!existingDaily) {
          await prisma.walletValueHistory.create({
            data: {
              walletId: wallet.id,
              balanceCrypto: medianSnapshot.balanceCrypto,
              balanceUsd: medianSnapshot.balanceUsd,
              cryptoPrice: medianSnapshot.cryptoPrice,
              snapshotAt: yesterday,
              granularity: 'DAILY',
            },
          });

          console.log(`✓ Created daily aggregate for wallet ${wallet.id}`);
        }
      } catch (error) {
        console.error(`Error aggregating wallet ${wallet.id}:`, error);
      }
    }

    console.log('✓ Snapshot aggregation complete');
  } catch (error) {
    console.error('Error in snapshot aggregation:', error);
    throw error;
  }
}

// Export for use in API routes or cron jobs
export default {
  trackAllWalletValues,
  trackWalletValue,
  aggregateSnapshots,
};
