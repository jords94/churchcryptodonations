/**
 * Bitcoin Address Validation Script
 *
 * This script helps you validate that BTC addresses are working correctly by:
 * 1. Checking address format and validity
 * 2. Querying blockchain explorers to verify the address exists
 * 3. Checking current balance (if any)
 * 4. Showing recent transactions
 *
 * Two ways to test:
 * - Generate a new address and check it
 * - Provide an existing address from your database
 *
 * Run with:
 *   npx tsx scripts/validate-btc-address.ts
 *   npx tsx scripts/validate-btc-address.ts bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
 */

import { validateBitcoinAddress, generateBitcoinWallet } from '../lib/crypto/bitcoin';

/**
 * Query Blockchair API for Bitcoin address information
 * Free tier: 1,440 requests per day
 * Docs: https://blockchair.com/api/docs
 */
async function checkBitcoinAddressOnBlockchair(address: string) {
  const apiUrl = `https://api.blockchair.com/bitcoin/dashboards/address/${address}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Blockchair API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data && data.data[address]) {
      const addressData = data.data[address];
      const { address: addr } = addressData;

      return {
        success: true,
        exists: true,
        balance: addr.balance / 100000000, // Convert satoshis to BTC
        balanceSatoshis: addr.balance,
        balanceUsd: addr.balance_usd,
        transactionCount: addr.transaction_count,
        receivedTotal: addr.received / 100000000,
        spentTotal: addr.spent / 100000000,
        firstSeenReceiving: addr.first_seen_receiving,
        lastSeenReceiving: addr.last_seen_receiving,
        addressType: addr.type,
      };
    }

    return {
      success: true,
      exists: false,
      message: 'Address exists on blockchain but has no activity yet',
    };
  } catch (error) {
    console.error('Error querying Blockchair:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Query Blockchain.info API as backup
 * Free, no API key required
 */
async function checkBitcoinAddressOnBlockchainInfo(address: string) {
  const apiUrl = `https://blockchain.info/balance?active=${address}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Blockchain.info API error: ${response.status}`);
    }

    const data = await response.json();

    if (data[address]) {
      const addressData = data[address];

      return {
        success: true,
        exists: true,
        balanceSatoshis: addressData.final_balance,
        balance: addressData.final_balance / 100000000,
        transactionCount: addressData.n_tx,
        receivedTotal: addressData.total_received / 100000000,
      };
    }

    return {
      success: true,
      exists: false,
      message: 'Address valid but no transactions yet',
    };
  } catch (error) {
    console.error('Error querying Blockchain.info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main validation function
 */
async function validateAddress(address: string) {
  console.log('='.repeat(70));
  console.log('BITCOIN ADDRESS VALIDATION');
  console.log('='.repeat(70));
  console.log();
  console.log('Address:', address);
  console.log();

  // Step 1: Local validation
  console.log('📋 Step 1: Local Format Validation');
  console.log('-'.repeat(70));

  const isValid = validateBitcoinAddress(address);
  console.log('  • Valid Format:', isValid ? '✅ YES' : '❌ NO');

  if (!isValid) {
    console.log();
    console.log('❌ VALIDATION FAILED: Invalid Bitcoin address format');
    console.log();
    return;
  }

  // Check address type
  let addressType = 'Unknown';
  if (address.startsWith('bc1q')) {
    addressType = 'Native SegWit (Bech32) - RECOMMENDED';
  } else if (address.startsWith('bc1p')) {
    addressType = 'Taproot (Bech32m)';
  } else if (address.startsWith('3')) {
    addressType = 'Wrapped SegWit (P2SH)';
  } else if (address.startsWith('1')) {
    addressType = 'Legacy (P2PKH)';
  }

  console.log('  • Address Type:', addressType);
  console.log('  • Length:', address.length, 'characters');
  console.log();

  // Step 2: Blockchain validation
  console.log('🔍 Step 2: Blockchain Explorer Checks');
  console.log('-'.repeat(70));
  console.log('Querying blockchain explorers...');
  console.log();

  // Try Blockchair first
  console.log('Checking Blockchair API...');
  const blockchairResult = await checkBitcoinAddressOnBlockchair(address);

  if (blockchairResult.success && blockchairResult.exists) {
    console.log('  ✅ Address found on blockchain!');
    console.log();
    console.log('  Balance:', blockchairResult.balance, 'BTC');
    console.log('  Balance (satoshis):', blockchairResult.balanceSatoshis);
    console.log('  Balance (USD):', blockchairResult.balanceUsd ? `$${blockchairResult.balanceUsd.toFixed(2)}` : 'N/A');
    console.log('  Total Received:', blockchairResult.receivedTotal, 'BTC');
    console.log('  Total Spent:', blockchairResult.spentTotal, 'BTC');
    console.log('  Transaction Count:', blockchairResult.transactionCount);

    if (blockchairResult.firstSeenReceiving) {
      console.log('  First Transaction:', new Date(blockchairResult.firstSeenReceiving).toLocaleString());
    }
    if (blockchairResult.lastSeenReceiving) {
      console.log('  Last Transaction:', new Date(blockchairResult.lastSeenReceiving).toLocaleString());
    }
    console.log();
  } else if (blockchairResult.success && !blockchairResult.exists) {
    console.log('  ℹ️  Address valid but no transactions yet');
    console.log('  This is normal for newly generated addresses');
    console.log();

    // Try blockchain.info as backup
    console.log('Checking Blockchain.info API...');
    const blockchainInfoResult = await checkBitcoinAddressOnBlockchainInfo(address);

    if (blockchainInfoResult.success && blockchainInfoResult.exists) {
      console.log('  ✅ Address confirmed by Blockchain.info');
      console.log('  Balance:', blockchainInfoResult.balance, 'BTC');
      console.log('  Transaction Count:', blockchainInfoResult.transactionCount);
      console.log();
    } else {
      console.log('  ℹ️  Blockchain.info also shows no activity');
      console.log();
    }
  } else {
    console.log('  ⚠️  Could not verify on blockchain (API error)');
    console.log('  Error:', blockchairResult.error);
    console.log();
  }

  // Step 3: Summary
  console.log('='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log('✅ Address format: VALID');
  console.log('✅ Address type:', addressType);

  if (blockchairResult.success && blockchairResult.exists) {
    console.log('✅ Blockchain status: ACTIVE (has transactions)');
    console.log(`💰 Current balance: ${blockchairResult.balance} BTC ($${blockchairResult.balanceUsd?.toFixed(2) || '0.00'})`);
  } else {
    console.log('ℹ️  Blockchain status: READY (awaiting first transaction)');
    console.log('💡 To test, send a small amount (0.0001 BTC) to this address');
  }

  console.log();
  console.log('🔗 View on Explorers:');
  console.log(`   • Blockchair: https://blockchair.com/bitcoin/address/${address}`);
  console.log(`   • Blockchain.info: https://blockchain.info/address/${address}`);
  console.log(`   • Mempool.space: https://mempool.space/address/${address}`);
  console.log();
  console.log('='.repeat(70));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // User provided an address
    const address = args[0];
    await validateAddress(address);
  } else {
    // Generate a new test address
    console.log('No address provided. Generating a new test address...');
    console.log();

    const wallet = generateBitcoinWallet();

    console.log('🆕 NEW WALLET GENERATED');
    console.log('='.repeat(70));
    console.log('Address:', wallet.address);
    console.log('Derivation Path:', wallet.derivationPath);
    console.log();
    console.log('⚠️  SECURITY WARNING:');
    console.log('This is a TEST wallet. The seed phrase is:');
    console.log(wallet.mnemonic);
    console.log();
    console.log('DO NOT use this for real funds! This is for testing only.');
    console.log('='.repeat(70));
    console.log();

    await validateAddress(wallet.address);

    console.log();
    console.log('💡 NEXT STEPS:');
    console.log('1. Send a small test amount (e.g., 0.0001 BTC) to the address above');
    console.log('2. Wait for 1 confirmation (~10 minutes)');
    console.log('3. Run this script again with the address:');
    console.log(`   npx tsx scripts/validate-btc-address.ts ${wallet.address}`);
    console.log();
  }
}

main().catch(console.error);
