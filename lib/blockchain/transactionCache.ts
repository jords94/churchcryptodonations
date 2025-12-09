/**
 * Transaction Cache Service
 *
 * Caches blockchain transaction data in the database to reduce API calls
 * and avoid rate limiting from blockchain providers.
 *
 * Strategy:
 * - Confirmed transactions are cached indefinitely (immutable)
 * - Pending transactions are cached for 5 minutes
 * - Cache automatically refreshes stale entries
 */

import prisma from '@/lib/db/prisma';
import type { Chain } from '@/config/chains';

export interface CachedTransaction {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountCrypto: string;
  amountUsd: string;
  confirmations: number;
  blockNumber: string | null;
  transactedAt: Date;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

/**
 * Get cached transactions for a wallet
 * Returns null if cache is empty or expired
 */
export async function getCachedTransactions(
  walletId: string
): Promise<CachedTransaction[] | null> {
  try {
    const now = new Date();

    // Fetch non-expired cached transactions
    const cached = await prisma.transactionCache.findMany({
      where: {
        walletId,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        transactedAt: 'desc',
      },
    });

    if (cached.length === 0) {
      return null;
    }

    // Convert to output format
    return cached.map((tx) => ({
      txHash: tx.txHash,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amountCrypto: tx.amountCrypto,
      amountUsd: tx.amountUsd,
      confirmations: tx.confirmations,
      blockNumber: tx.blockNumber,
      transactedAt: tx.transactedAt,
      status: tx.status as 'PENDING' | 'CONFIRMED' | 'FAILED',
    }));
  } catch (error) {
    console.error('Error fetching cached transactions:', error);
    return null;
  }
}

/**
 * Cache transactions in the database
 *
 * @param walletId - Wallet ID
 * @param chain - Blockchain
 * @param transactions - Transactions to cache
 */
export async function cacheTransactions(
  walletId: string,
  chain: Chain,
  transactions: CachedTransaction[]
): Promise<void> {
  try {
    const now = new Date();

    // Upsert each transaction
    for (const tx of transactions) {
      // Calculate expiration time
      // - Confirmed transactions: 30 days (essentially permanent)
      // - Pending transactions: 5 minutes
      const expiresAt = new Date(
        now.getTime() +
          (tx.status === 'CONFIRMED' ? 30 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000)
      );

      await prisma.transactionCache.upsert({
        where: {
          walletId_txHash: {
            walletId,
            txHash: tx.txHash,
          },
        },
        create: {
          walletId,
          txHash: tx.txHash,
          chain,
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          amountCrypto: tx.amountCrypto,
          amountUsd: tx.amountUsd,
          confirmations: tx.confirmations,
          blockNumber: tx.blockNumber,
          transactedAt: tx.transactedAt,
          status: tx.status,
          expiresAt,
        },
        update: {
          confirmations: tx.confirmations,
          status: tx.status,
          expiresAt,
        },
      });
    }

    console.log(`✓ Cached ${transactions.length} transactions for wallet ${walletId}`);
  } catch (error) {
    console.error('Error caching transactions:', error);
    // Don't throw - caching is non-critical
  }
}

/**
 * Clear expired cache entries (cleanup function)
 * Should be run periodically (e.g., daily cron job)
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const now = new Date();

    const result = await prisma.transactionCache.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(`✓ Cleared ${result.count} expired cache entries`);
    return result.count;
  } catch (error) {
    console.error('Error clearing expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  confirmedEntries: number;
  pendingEntries: number;
  expiredEntries: number;
}> {
  try {
    const now = new Date();

    const [total, confirmed, pending, expired] = await Promise.all([
      prisma.transactionCache.count(),
      prisma.transactionCache.count({
        where: { status: 'CONFIRMED' },
      }),
      prisma.transactionCache.count({
        where: { status: 'PENDING' },
      }),
      prisma.transactionCache.count({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
    ]);

    return {
      totalEntries: total,
      confirmedEntries: confirmed,
      pendingEntries: pending,
      expiredEntries: expired,
    };
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return {
      totalEntries: 0,
      confirmedEntries: 0,
      pendingEntries: 0,
      expiredEntries: 0,
    };
  }
}
