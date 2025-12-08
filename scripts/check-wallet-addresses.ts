/**
 * Check Wallet Addresses in Database
 *
 * This script checks all wallet addresses in the database to verify:
 * - Correct format (bc1 for BTC, 0x for USDC)
 * - No invalid prefixes or duplications
 * - Address validity
 *
 * Run with: npx tsx scripts/check-wallet-addresses.ts
 */

import prisma from '../lib/db/prisma';
import { validateBitcoinAddress } from '../lib/crypto/bitcoin';
import { validateEthereumAddress } from '../lib/crypto/ethereum';

async function main() {
  console.log('='.repeat(70));
  console.log('WALLET ADDRESS VERIFICATION');
  console.log('='.repeat(70));
  console.log();

  // Fetch all wallets
  const wallets = await prisma.wallet.findMany({
    select: {
      id: true,
      chain: true,
      address: true,
      label: true,
      church: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (wallets.length === 0) {
    console.log('No wallets found in database');
    return;
  }

  console.log(`Found ${wallets.length} wallet(s)\n`);

  let validCount = 0;
  let invalidCount = 0;

  for (const wallet of wallets) {
    console.log('-'.repeat(70));
    console.log(`Wallet ID: ${wallet.id}`);
    console.log(`Church: ${wallet.church.name}`);
    console.log(`Label: ${wallet.label || '(no label)'}`);
    console.log(`Chain: ${wallet.chain}`);
    console.log(`Address: ${wallet.address}`);
    console.log();

    // Check address format
    let isValid = false;
    let issues: string[] = [];

    if (wallet.chain === 'BTC') {
      // Check for common issues
      if (wallet.address.startsWith('btc1q')) {
        issues.push('❌ INVALID PREFIX: Starts with "btc1q" instead of "bc1q"');
        issues.push('   Expected: bc1q...');
        issues.push(`   Actual: ${wallet.address}`);

        // Check if removing "btc" would make it valid
        const fixedAddress = wallet.address.replace(/^btc1q/, 'bc1q');
        if (validateBitcoinAddress(fixedAddress)) {
          issues.push(`   ✅ Can be fixed to: ${fixedAddress}`);
        }
      } else if (wallet.address.startsWith('bc1qbc1q')) {
        issues.push('❌ DUPLICATION: Address has "bc1q" twice');
        issues.push(`   This looks like: "bc1q" + "bc1q..."`);

        // Try to fix by removing first bc1q
        const fixedAddress = wallet.address.substring(4); // Remove "bc1q"
        if (validateBitcoinAddress(fixedAddress)) {
          issues.push(`   ✅ Can be fixed to: ${fixedAddress}`);
        }
      } else {
        isValid = validateBitcoinAddress(wallet.address);
        if (!isValid) {
          issues.push('❌ INVALID: Does not pass Bitcoin address validation');
        }
      }

      // Additional checks
      if (!wallet.address.startsWith('bc1')) {
        if (wallet.address.startsWith('1')) {
          issues.push('⚠️  Legacy P2PKH address (starts with "1")');
          issues.push('   Recommendation: Use bc1 (Native SegWit) for lower fees');
        } else if (wallet.address.startsWith('3')) {
          issues.push('⚠️  Wrapped SegWit address (starts with "3")');
          issues.push('   Recommendation: Use bc1 (Native SegWit) for lower fees');
        }
      }
    } else if (wallet.chain === 'USDC' || wallet.chain === 'ETH') {
      isValid = validateEthereumAddress(wallet.address);

      if (!isValid) {
        issues.push('❌ INVALID: Does not pass Ethereum address validation');
      }

      if (!wallet.address.startsWith('0x')) {
        issues.push('❌ MISSING 0x PREFIX: Ethereum addresses must start with 0x');
      }

      if (wallet.address.length !== 42) {
        issues.push(`❌ WRONG LENGTH: ${wallet.address.length} chars (should be 42)`);
      }
    }

    // Print results
    if (issues.length > 0) {
      invalidCount++;
      console.log('Status: ❌ ISSUES FOUND');
      console.log();
      for (const issue of issues) {
        console.log(issue);
      }
    } else {
      validCount++;
      console.log('Status: ✅ VALID');
    }

    console.log();
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Wallets: ${wallets.length}`);
  console.log(`Valid: ${validCount} ✅`);
  console.log(`Invalid: ${invalidCount} ❌`);
  console.log();

  if (invalidCount > 0) {
    console.log('⚠️  ISSUES FOUND');
    console.log();
    console.log('To fix invalid addresses:');
    console.log('1. Check the wallet generation code in lib/crypto/bitcoin.ts');
    console.log('2. Verify addresses are stored correctly in database');
    console.log('3. Re-create affected wallets with correct addresses');
    console.log();
  } else {
    console.log('✅ ALL WALLETS VALID');
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
