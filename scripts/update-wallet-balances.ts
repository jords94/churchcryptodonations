/**
 * Update Wallet Balances Script
 *
 * Updates cryptocurrency wallet balances by querying blockchain APIs.
 * This script should be run periodically via cron job or scheduler.
 *
 * Usage:
 *   npx tsx scripts/update-wallet-balances.ts                    # Update all wallets
 *   npx tsx scripts/update-wallet-balances.ts --wallet WALLET_ID # Update specific wallet
 *   npx tsx scripts/update-wallet-balances.ts --church CHURCH_ID # Update church wallets
 *
 * Recommended schedule:
 *   Bitcoin: Every 5-10 minutes (cron: 'star/10 * * * *' - replace star with *)
 *   Ethereum/USDC: Every 1-2 minutes (cron: 'star/2 * * * *' - replace star with *)
 *   Combined: Every 5 minutes (cron: 'star/5 * * * *' - replace star with *)
 *
 * Environment variables required:
 *   BLOCKCHAIR_API_KEY (optional, but recommended for higher rate limits)
 *   ALCHEMY_API_KEY (required for Ethereum/USDC)
 *   COINGECKO_API_KEY (optional, for higher rate limits)
 *
 * Example cron configuration (in crontab):
 *   # Update all wallet balances every 5 minutes
 *   star/5 * * * * cd /path/to/project && npx tsx scripts/update-wallet-balances.ts >> /var/log/wallet-balance-update.log 2>&1
 *   (Replace 'star' with asterisk)
 */

import {
  updateWalletBalance,
  updateChurchWalletBalances,
  updateAllWalletBalances,
} from '../lib/blockchain/balanceMonitor';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    mode: 'all' | 'wallet' | 'church';
    id?: string;
  } = {
    mode: 'all',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--wallet' || arg === '-w') {
      options.mode = 'wallet';
      options.id = args[i + 1];
      i++;
    } else if (arg === '--church' || arg === '-c') {
      options.mode = 'church';
      options.id = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage:
  npx tsx scripts/update-wallet-balances.ts [options]

Options:
  --wallet, -w WALLET_ID    Update specific wallet only
  --church, -c CHURCH_ID    Update all wallets for specific church
  --help, -h                Show this help message

Examples:
  npx tsx scripts/update-wallet-balances.ts
  npx tsx scripts/update-wallet-balances.ts --wallet cm12345abc
  npx tsx scripts/update-wallet-balances.ts --church cm67890xyz

Environment Variables:
  BLOCKCHAIR_API_KEY    Optional. Higher rate limits for Bitcoin.
  ALCHEMY_API_KEY       Required. For Ethereum and USDC balance checks.
  COINGECKO_API_KEY     Optional. Higher rate limits for price data.

Recommended Cron Schedule:
  star/5 * * * *   Every 5 minutes (recommended for production)
  star/10 * * * *  Every 10 minutes (conservative)
  star/2 * * * *   Every 2 minutes (for high-frequency needs)
  (Replace 'star' with * in actual crontab)
      `);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  console.log('='.repeat(70));
  console.log('WALLET BALANCE UPDATE SCRIPT');
  console.log('='.repeat(70));
  console.log('Started at:', new Date().toISOString());
  console.log();

  try {
    if (options.mode === 'wallet' && options.id) {
      // Update single wallet
      console.log(`Mode: Update single wallet (${options.id})`);
      console.log();

      const result = await updateWalletBalance(options.id);

      if (result.success) {
        console.log('✅ SUCCESS');
        console.log(`  Wallet ID: ${result.walletId}`);
        console.log(`  Chain: ${result.chain}`);
        console.log(`  Balance: ${result.balanceCrypto} ${result.chain}`);
        console.log(`  USD Value: $${result.balanceUsd.toFixed(2)}`);
      } else {
        console.log('❌ FAILED');
        console.log(`  Error: ${result.error}`);
        process.exit(1);
      }
    } else if (options.mode === 'church' && options.id) {
      // Update all wallets for a church
      console.log(`Mode: Update church wallets (${options.id})`);
      console.log();

      const result = await updateChurchWalletBalances(options.id);

      console.log('Results:');
      console.log(`  Total Updated: ${result.totalUpdated}`);
      console.log(`  Total Failed: ${result.totalFailed}`);
      console.log();

      if (result.results.length > 0) {
        console.log('Details:');
        for (const walletResult of result.results) {
          const status = walletResult.success ? '✅' : '❌';
          console.log(
            `  ${status} ${walletResult.walletId} (${walletResult.chain}): ${walletResult.balanceCrypto || 'N/A'} ${walletResult.chain}`
          );
          if (walletResult.error) {
            console.log(`     Error: ${walletResult.error}`);
          }
        }
      }

      if (result.totalFailed > 0) {
        process.exit(1);
      }
    } else {
      // Update all wallets
      console.log('Mode: Update all wallets');
      console.log();

      const result = await updateAllWalletBalances();

      console.log('='.repeat(70));
      console.log('SUMMARY');
      console.log('='.repeat(70));
      console.log(`Total Wallets: ${result.totalWallets}`);
      console.log(`Updated: ${result.totalUpdated}`);
      console.log(`Failed: ${result.totalFailed}`);
      console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log();

      if (result.totalUpdated > 0) {
        console.log(`✅ Successfully updated ${result.totalUpdated} wallet(s)`);
      }

      if (result.totalFailed > 0) {
        console.log(`⚠️  Failed to update ${result.totalFailed} wallet(s)`);
        process.exit(1);
      }
    }

    console.log();
    console.log('Completed at:', new Date().toISOString());
    console.log('='.repeat(70));
  } catch (error) {
    console.error('❌ FATAL ERROR');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
