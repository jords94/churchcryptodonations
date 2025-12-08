/**
 * Find Wallet ID by Address
 *
 * Looks up a wallet's database ID by its blockchain address
 *
 * Usage: npx tsx scripts/find-wallet-id.ts ADDRESS
 */

import prisma from '../lib/db/prisma';

async function main() {
  const address = process.argv[2];

  if (!address) {
    console.log('Usage: npx tsx scripts/find-wallet-id.ts ADDRESS');
    console.log('Example: npx tsx scripts/find-wallet-id.ts bc1qep4t6gl4fukp4un32t6uqxpztt9rgl62u2rkqm');
    process.exit(1);
  }

  console.log(`Looking for wallet with address: ${address}`);
  console.log();

  const wallet = await prisma.wallet.findFirst({
    where: {
      address: {
        equals: address,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      chain: true,
      address: true,
      label: true,
      balanceCrypto: true,
      balanceUsd: true,
      church: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!wallet) {
    console.log('❌ Wallet not found in database');
    console.log();
    console.log('Make sure:');
    console.log('1. The address is correct');
    console.log('2. The wallet was created through the dashboard');
    console.log('3. You are connected to the correct database');
    process.exit(1);
  }

  console.log('✅ Wallet Found!');
  console.log();
  console.log('Wallet ID:', wallet.id);
  console.log('Chain:', wallet.chain);
  console.log('Address:', wallet.address);
  console.log('Label:', wallet.label || '(none)');
  console.log('Church:', wallet.church.name);
  console.log('Church ID:', wallet.church.id);
  console.log('Current Balance:', wallet.balanceCrypto, wallet.chain);
  console.log('USD Value:', wallet.balanceUsd);
  console.log();
  console.log('To update this wallet, run:');
  console.log(`  npx tsx scripts/update-wallet-balances.ts --wallet ${wallet.id}`);
  console.log();
  console.log('To update all wallets for this church, run:');
  console.log(`  npx tsx scripts/update-wallet-balances.ts --church ${wallet.church.id}`);
  console.log();

  await prisma.$disconnect();
}

main().catch(console.error);
