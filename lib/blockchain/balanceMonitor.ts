/**
 * Blockchain Balance Monitor
 *
 * Monitors cryptocurrency wallet balances and updates the database.
 * Supports Bitcoin (BTC) and Ethereum-based tokens (USDC).
 *
 * Architecture:
 * - Polls blockchain APIs periodically
 * - Updates wallet balances in database
 * - Fetches current USD prices
 * - Can be run as cron job or continuous service
 *
 * Recommended polling frequency:
 * - Bitcoin: Every 5-10 minutes (block time ~10 min)
 * - Ethereum/USDC: Every 1-2 minutes (block time ~12 sec)
 *
 * API Providers:
 * - Bitcoin: Blockchair (free: 1,440 req/day = 1 req/min)
 * - Ethereum: Alchemy or Etherscan
 * - Prices: CoinGecko (free: 50 calls/min)
 */

import prisma from '@/lib/db/prisma';
import type { Chain } from '@/config/chains';

/**
 * Bitcoin balance check using blockchain.info (fallback API)
 * Free, no API key required, no rate limits
 */
async function checkBitcoinBalanceBlockchainInfo(address: string): Promise<{
  balanceCrypto: string;
  balanceSatoshis: number;
  balanceUsd: number;
}> {
  const apiUrl = `https://blockchain.info/balance?active=${address}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Blockchain.info API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data[address]) {
    // Address has no transactions yet
    return {
      balanceCrypto: '0',
      balanceSatoshis: 0,
      balanceUsd: 0,
    };
  }

  const addressData = data[address];
  const balanceSatoshis = addressData.final_balance;
  const balanceBTC = balanceSatoshis / 100000000;

  // Get BTC price for USD conversion
  let balanceUsd = 0;
  try {
    const btcPrice = await getCryptoPrice('bitcoin');
    balanceUsd = balanceBTC * btcPrice;
  } catch (error) {
    console.warn('Failed to get BTC price, USD value will be 0');
  }

  return {
    balanceCrypto: balanceBTC.toFixed(8),
    balanceSatoshis,
    balanceUsd,
  };
}

/**
 * Bitcoin balance check using Blockchair (primary) with blockchain.info fallback
 */
async function checkBitcoinBalance(address: string): Promise<{
  balanceCrypto: string;
  balanceSatoshis: number;
  balanceUsd: number;
}> {
  const apiKey = process.env.BLOCKCHAIR_API_KEY || '';
  const apiUrl = `https://api.blockchair.com/bitcoin/dashboards/address/${address}${apiKey ? `?key=${apiKey}` : ''}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Rate limited (430) or other error - fall back to blockchain.info
      if (response.status === 430 || response.status === 429) {
        console.log('⚠️  Blockchair rate limit hit, using blockchain.info fallback...');
        return await checkBitcoinBalanceBlockchainInfo(address);
      }
      throw new Error(`Blockchair API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[address]) {
      // Address has no transactions yet
      return {
        balanceCrypto: '0',
        balanceSatoshis: 0,
        balanceUsd: 0,
      };
    }

    const addressData = data.data[address].address;

    return {
      balanceCrypto: (addressData.balance / 100000000).toFixed(8), // Satoshis to BTC
      balanceSatoshis: addressData.balance,
      balanceUsd: addressData.balance_usd || 0,
    };
  } catch (error) {
    // If Blockchair fails for any reason, try blockchain.info
    console.log('⚠️  Blockchair failed, using blockchain.info fallback...');
    return await checkBitcoinBalanceBlockchainInfo(address);
  }
}

/**
 * Ethereum balance check using Alchemy
 * For USDC, we need to check ERC-20 token balance
 */
async function checkEthereumBalance(
  address: string,
  chain: 'ETH' | 'USDC'
): Promise<{
  balanceCrypto: string;
  balanceWei: string;
  balanceUsd: number;
}> {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;

  if (!alchemyApiKey) {
    throw new Error('ALCHEMY_API_KEY not configured');
  }

  const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

  if (chain === 'USDC') {
    // USDC is an ERC-20 token
    // USDC contract address on Ethereum mainnet
    const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    // Call eth_call to get ERC-20 balance
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: USDC_CONTRACT,
            data: `0x70a08231000000000000000000000000${address.slice(2)}`, // balanceOf(address)
          },
          'latest',
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    const balanceHex = data.result;
    const balanceSmallest = BigInt(balanceHex);

    // USDC has 6 decimals
    const balance = Number(balanceSmallest) / 1000000;

    // Get USD price (USDC is always ~$1)
    const balanceUsd = balance;

    return {
      balanceCrypto: balance.toFixed(6),
      balanceWei: balanceSmallest.toString(),
      balanceUsd,
    };
  } else {
    // ETH balance
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    const balanceWei = BigInt(data.result);
    const balanceEth = Number(balanceWei) / 1e18;

    // Get ETH price
    const ethPrice = await getCryptoPrice('ethereum');
    const balanceUsd = balanceEth * ethPrice;

    return {
      balanceCrypto: balanceEth.toFixed(6),
      balanceWei: balanceWei.toString(),
      balanceUsd,
    };
  }
}

/**
 * Get cryptocurrency price in USD from CoinGecko
 */
async function getCryptoPrice(coinId: string): Promise<number> {
  const apiKey = process.env.COINGECKO_API_KEY || '';
  const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd${apiKey ? `&x_cg_pro_api_key=${apiKey}` : ''}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data[coinId] || !data[coinId].usd) {
    throw new Error(`Price not found for ${coinId}`);
  }

  return data[coinId].usd;
}

/**
 * Update a single wallet's balance
 */
export async function updateWalletBalance(walletId: string): Promise<{
  success: boolean;
  walletId: string;
  chain: Chain;
  balanceCrypto: string;
  balanceUsd: number;
  error?: string;
}> {
  try {
    // Fetch wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        chain: true,
        address: true,
        isActive: true,
      },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new Error('Wallet is not active');
    }

    let balanceCrypto = '0';
    let balanceUsd = 0;

    // Check balance based on chain
    switch (wallet.chain) {
      case 'BTC': {
        const btcBalance = await checkBitcoinBalance(wallet.address);
        balanceCrypto = btcBalance.balanceCrypto;
        balanceUsd = btcBalance.balanceUsd;
        break;
      }

      case 'USDC': {
        const usdcBalance = await checkEthereumBalance(wallet.address, 'USDC');
        balanceCrypto = usdcBalance.balanceCrypto;
        balanceUsd = usdcBalance.balanceUsd;
        break;
      }

      case 'ETH': {
        const ethBalance = await checkEthereumBalance(wallet.address, 'ETH');
        balanceCrypto = ethBalance.balanceCrypto;
        balanceUsd = ethBalance.balanceUsd;
        break;
      }

      default:
        throw new Error(`Unsupported chain: ${wallet.chain}`);
    }

    // Update database
    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        balanceCrypto,
        balanceUsd: balanceUsd.toFixed(2),
        lastBalanceUpdate: new Date(),
      },
    });

    return {
      success: true,
      walletId: wallet.id,
      chain: wallet.chain,
      balanceCrypto,
      balanceUsd,
    };
  } catch (error) {
    console.error(`Error updating wallet ${walletId}:`, error);

    return {
      success: false,
      walletId,
      chain: 'BTC', // Default, will be overridden
      balanceCrypto: '0',
      balanceUsd: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update all active wallets for a church
 */
export async function updateChurchWalletBalances(churchId: string): Promise<{
  success: boolean;
  totalUpdated: number;
  totalFailed: number;
  results: Array<{
    walletId: string;
    chain: Chain;
    success: boolean;
    balanceCrypto?: string;
    balanceUsd?: number;
    error?: string;
  }>;
}> {
  try {
    // Fetch all active wallets for this church
    const wallets = await prisma.wallet.findMany({
      where: {
        churchId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const results = [];
    let totalUpdated = 0;
    let totalFailed = 0;

    // Update each wallet
    for (const wallet of wallets) {
      const result = await updateWalletBalance(wallet.id);

      if (result.success) {
        totalUpdated++;
      } else {
        totalFailed++;
      }

      results.push({
        walletId: result.walletId,
        chain: result.chain,
        success: result.success,
        balanceCrypto: result.balanceCrypto,
        balanceUsd: result.balanceUsd,
        error: result.error,
      });
    }

    return {
      success: true,
      totalUpdated,
      totalFailed,
      results,
    };
  } catch (error) {
    console.error(`Error updating church ${churchId} wallets:`, error);

    return {
      success: false,
      totalUpdated: 0,
      totalFailed: 0,
      results: [],
    };
  }
}

/**
 * Update all active wallets in the entire system
 */
export async function updateAllWalletBalances(): Promise<{
  success: boolean;
  totalWallets: number;
  totalUpdated: number;
  totalFailed: number;
  duration: number;
}> {
  const startTime = Date.now();

  try {
    // Fetch all active wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    let totalUpdated = 0;
    let totalFailed = 0;

    console.log(`Starting balance update for ${wallets.length} wallets...`);

    // Update each wallet
    for (const wallet of wallets) {
      const result = await updateWalletBalance(wallet.id);

      if (result.success) {
        totalUpdated++;
        console.log(`✅ Updated ${wallet.id} (${result.chain}): ${result.balanceCrypto} = $${result.balanceUsd.toFixed(2)}`);
      } else {
        totalFailed++;
        console.error(`❌ Failed ${wallet.id}: ${result.error}`);
      }

      // Rate limiting: wait 100ms between requests to avoid hitting API limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;

    console.log();
    console.log(`Balance update complete in ${duration}ms`);
    console.log(`Total: ${wallets.length}, Updated: ${totalUpdated}, Failed: ${totalFailed}`);

    return {
      success: true,
      totalWallets: wallets.length,
      totalUpdated,
      totalFailed,
      duration,
    };
  } catch (error) {
    console.error('Error updating all wallet balances:', error);

    return {
      success: false,
      totalWallets: 0,
      totalUpdated: 0,
      totalFailed: 0,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Transaction data from blockchain
 */
export interface BlockchainTransaction {
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountCrypto: string;
  amountUsd: number;
  confirmations: number;
  blockNumber: string;
  transactedAt: Date;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

/**
 * Fetch Bitcoin transaction history using blockchain.info
 */
async function fetchBitcoinTransactionsBlockchainInfo(
  address: string
): Promise<BlockchainTransaction[]> {
  const apiUrl = `https://blockchain.info/rawaddr/${address}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Blockchain.info API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.txs || data.txs.length === 0) {
    return [];
  }

  // Get BTC price for USD conversion
  let btcPrice = 0;
  try {
    btcPrice = await getCryptoPrice('bitcoin');
  } catch (error) {
    console.warn('Failed to get BTC price for transaction history');
  }

  const transactions: BlockchainTransaction[] = data.txs.map((tx: any) => {
    // Determine if this is incoming or outgoing
    const isIncoming = tx.out.some((out: any) => out.addr === address);

    // Calculate the amount for this address
    let amountSatoshis = 0;
    if (isIncoming) {
      // Sum all outputs to this address
      tx.out.forEach((out: any) => {
        if (out.addr === address) {
          amountSatoshis += out.value;
        }
      });
    }

    const amountBTC = amountSatoshis / 100000000;
    const amountUsd = amountBTC * btcPrice;

    // Get sender address (first input address)
    const fromAddress = tx.inputs?.[0]?.prev_out?.addr || 'Unknown';

    // Get receiver address (this wallet)
    const toAddress = address;

    // Determine status based on confirmations
    // Bitcoin typically requires 3 confirmations for "confirmed" status
    const confirmations = data.n_tx ? (data.n_tx - data.txs.indexOf(tx)) : 0;
    const status = confirmations >= 3 ? 'CONFIRMED' : 'PENDING';

    return {
      txHash: tx.hash,
      fromAddress,
      toAddress,
      amountCrypto: amountBTC.toFixed(8),
      amountUsd,
      confirmations,
      blockNumber: tx.block_height?.toString() || '0',
      transactedAt: new Date(tx.time * 1000),
      status,
    };
  });

  return transactions;
}

/**
 * Fetch Bitcoin transaction history using Blockchair (primary) with blockchain.info fallback
 */
async function fetchBitcoinTransactions(address: string): Promise<BlockchainTransaction[]> {
  const apiKey = process.env.BLOCKCHAIR_API_KEY || '';
  const apiUrl = `https://api.blockchair.com/bitcoin/dashboards/address/${address}${apiKey ? `?key=${apiKey}` : ''}`;

  try {
    const response = await fetch(apiUrl);

    // If rate limited, fall back to blockchain.info
    if (response.status === 430 || response.status === 429) {
      console.log('⚠️  Blockchair rate limit hit, using blockchain.info fallback for transactions...');
      return await fetchBitcoinTransactionsBlockchainInfo(address);
    }

    if (!response.ok) {
      throw new Error(`Blockchair API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[address]) {
      return [];
    }

    const addressData = data.data[address];

    if (!addressData.transactions || addressData.transactions.length === 0) {
      return [];
    }

    // Get BTC price for USD conversion
    let btcPrice = 0;
    try {
      btcPrice = await getCryptoPrice('bitcoin');
    } catch (error) {
      console.warn('Failed to get BTC price for transaction history');
    }

    const transactions: BlockchainTransaction[] = addressData.transactions.map((txHash: string) => {
      const tx = data.data[address].transactions_data?.[txHash];

      if (!tx) {
        return null;
      }

      // Determine if this is incoming or outgoing
      const isIncoming = tx.outputs.some((out: any) => out.recipient === address);

      // Calculate the amount for this address
      let amountSatoshis = 0;
      if (isIncoming) {
        tx.outputs.forEach((out: any) => {
          if (out.recipient === address) {
            amountSatoshis += out.value;
          }
        });
      }

      const amountBTC = amountSatoshis / 100000000;
      const amountUsd = amountBTC * btcPrice;

      // Get sender address (first input)
      const fromAddress = tx.inputs?.[0]?.recipient || 'Unknown';
      const toAddress = address;

      // Blockchair doesn't provide confirmations directly, but we can estimate
      const confirmations = data.context?.state ? (data.context.state - tx.block_id) : 0;
      const status = confirmations >= 3 ? 'CONFIRMED' : 'PENDING';

      return {
        txHash,
        fromAddress,
        toAddress,
        amountCrypto: amountBTC.toFixed(8),
        amountUsd,
        confirmations,
        blockNumber: tx.block_id?.toString() || '0',
        transactedAt: new Date(tx.time),
        status,
      };
    }).filter((tx: any) => tx !== null);

    return transactions;
  } catch (error) {
    console.log('⚠️  Blockchair failed, using blockchain.info fallback for transactions...');
    return await fetchBitcoinTransactionsBlockchainInfo(address);
  }
}

/**
 * Fetch Ethereum/USDC transaction history using Alchemy
 */
async function fetchEthereumTransactions(
  address: string,
  chain: 'ETH' | 'USDC'
): Promise<BlockchainTransaction[]> {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;

  if (!alchemyApiKey) {
    throw new Error('ALCHEMY_API_KEY not configured');
  }

  const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

  if (chain === 'USDC') {
    // USDC is an ERC-20 token
    const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    // Fetch token transfers using Alchemy's getAssetTransfers
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: address,
            contractAddresses: [USDC_CONTRACT],
            category: ['erc20'],
            withMetadata: true,
            maxCount: '0x64', // 100 transactions max
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    const transfers = data.result?.transfers || [];

    const transactions: BlockchainTransaction[] = transfers.map((transfer: any) => {
      const amountUsd = parseFloat(transfer.value || 0);

      return {
        txHash: transfer.hash,
        fromAddress: transfer.from,
        toAddress: transfer.to,
        amountCrypto: transfer.value?.toFixed(6) || '0',
        amountUsd,
        confirmations: transfer.metadata?.blockNumber ? 12 : 0, // Assume confirmed if block number exists
        blockNumber: transfer.blockNum || '0',
        transactedAt: new Date(transfer.metadata?.blockTimestamp || Date.now()),
        status: transfer.metadata?.blockNumber ? 'CONFIRMED' : 'PENDING',
      };
    });

    return transactions;
  } else {
    // ETH transactions
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: address,
            category: ['external'],
            withMetadata: true,
            maxCount: '0x64',
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    const transfers = data.result?.transfers || [];

    // Get ETH price for USD conversion
    let ethPrice = 0;
    try {
      ethPrice = await getCryptoPrice('ethereum');
    } catch (error) {
      console.warn('Failed to get ETH price for transaction history');
    }

    const transactions: BlockchainTransaction[] = transfers.map((transfer: any) => {
      const amountEth = parseFloat(transfer.value || 0);
      const amountUsd = amountEth * ethPrice;

      return {
        txHash: transfer.hash,
        fromAddress: transfer.from,
        toAddress: transfer.to,
        amountCrypto: amountEth.toFixed(6),
        amountUsd,
        confirmations: transfer.metadata?.blockNumber ? 12 : 0,
        blockNumber: transfer.blockNum || '0',
        transactedAt: new Date(transfer.metadata?.blockTimestamp || Date.now()),
        status: transfer.metadata?.blockNumber ? 'CONFIRMED' : 'PENDING',
      };
    });

    return transactions;
  }
}

/**
 * Get transaction history for a wallet
 */
export async function getWalletTransactionHistory(walletId: string): Promise<{
  success: boolean;
  transactions: BlockchainTransaction[];
  error?: string;
}> {
  try {
    // Fetch wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        chain: true,
        address: true,
        isActive: true,
      },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    let transactions: BlockchainTransaction[] = [];

    // Fetch transactions based on chain
    switch (wallet.chain) {
      case 'BTC':
        transactions = await fetchBitcoinTransactions(wallet.address);
        break;

      case 'USDC':
        transactions = await fetchEthereumTransactions(wallet.address, 'USDC');
        break;

      case 'ETH':
        transactions = await fetchEthereumTransactions(wallet.address, 'ETH');
        break;

      default:
        throw new Error(`Unsupported chain: ${wallet.chain}`);
    }

    // Sort by date descending (newest first)
    transactions.sort((a, b) => b.transactedAt.getTime() - a.transactedAt.getTime());

    return {
      success: true,
      transactions,
    };
  } catch (error) {
    console.error(`Error fetching transaction history for wallet ${walletId}:`, error);

    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
