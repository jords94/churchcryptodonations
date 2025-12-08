/**
 * Blockchain Configuration
 *
 * This file defines configuration for all supported blockchain networks.
 * Includes: network parameters, confirmation thresholds, derivation paths,
 * and API endpoints for each chain.
 *
 * Supported chains: Bitcoin (BTC), Ethereum (ETH), USD Coin (USDC), XRP
 */

/**
 * Chain type definition
 * Matches the Prisma enum for type safety
 *
 * MVP: BTC + USDC only
 */
export type Chain = 'BTC' | 'USDC';
// MVP-DEFERRED: Additional chains for future
// export type Chain = 'BTC' | 'ETH' | 'USDC' | 'XRP';

/**
 * Chain configuration interface
 */
export interface ChainConfig {
  // Display information
  name: string;
  fullName: string;
  symbol: string;
  decimals: number;

  // BIP44 derivation path components
  // Format: m / purpose' / coin_type' / account' / change / address_index
  coinType: number;

  // Confirmation thresholds
  // Number of block confirmations required before considering a transaction final
  confirmations: number;

  // Block time (average time between blocks in seconds)
  blockTime: number;

  // Explorer URLs for transaction lookups
  explorerUrl: string;
  explorerTxPath: string;
  explorerAddressPath: string;

  // Network identifiers
  network: 'mainnet' | 'testnet';
  networkId?: number; // For EVM chains

  // API endpoints
  rpcUrl?: string;

  // MoonPay currency code
  moonpayCurrencyCode: string;

  // Display color (for UI)
  color: string;
  icon: string;
}

/**
 * Chain configurations
 *
 * SECURITY NOTE:
 * - These are mainnet configurations for production
 * - For testnet, update network, networkId, and rpcUrl values
 * - Never expose private keys or API keys in this file
 */
export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  /**
   * Bitcoin Configuration
   *
   * - Coin type: 0 (BIP44 standard for Bitcoin)
   * - Confirmations: 3 (≈30 minutes for security)
   * - Uses Blockchair API for transaction monitoring
   */
  BTC: {
    name: 'Bitcoin',
    fullName: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8, // Bitcoin uses 8 decimal places (satoshis)

    coinType: 0, // BIP44 coin type for Bitcoin
    confirmations: 3, // Wait for 3 confirmations before considering final
    blockTime: 600, // Average 10 minutes per block

    explorerUrl: 'https://blockchair.com/bitcoin',
    explorerTxPath: '/transaction',
    explorerAddressPath: '/address',

    network: 'mainnet',

    moonpayCurrencyCode: 'btc',

    color: '#F7931A', // Bitcoin orange
    icon: '₿',
  },

  // MVP-DEFERRED: Ethereum will be re-enabled post-MVP
  // /**
  //  * Ethereum Configuration
  //  *
  //  * - Coin type: 60 (BIP44 standard for Ethereum)
  //  * - Confirmations: 12 (≈3 minutes for security)
  //  * - Uses Alchemy API for real-time webhooks
  //  */
  // ETH: {
  //   name: 'Ethereum',
  //   fullName: 'Ethereum',
  //   symbol: 'ETH',
  //   decimals: 18, // Ethereum uses 18 decimal places (wei)
  //
  //   coinType: 60, // BIP44 coin type for Ethereum
  //   confirmations: 12, // Wait for 12 confirmations
  //   blockTime: 12, // Average 12 seconds per block
  //
  //   explorerUrl: 'https://etherscan.io',
  //   explorerTxPath: '/tx',
  //   explorerAddressPath: '/address',
  //
  //   network: 'mainnet',
  //   networkId: 1, // Ethereum mainnet chain ID
  //
  //   rpcUrl: process.env.ALCHEMY_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/',
  //
  //   moonpayCurrencyCode: 'eth',
  //
  //   color: '#627EEA', // Ethereum purple
  //   icon: 'Ξ',
  // },

  /**
   * USDC Configuration
   *
   * - USDC is an ERC-20 token on Ethereum
   * - Uses same derivation path as ETH (shares wallet)
   * - Confirmations same as ETH parent chain
   */
  USDC: {
    name: 'USD Coin',
    fullName: 'USD Coin (ERC-20)',
    symbol: 'USDC',
    decimals: 6, // USDC uses 6 decimal places

    coinType: 60, // Same as Ethereum (it's an ERC-20 token)
    confirmations: 12, // Same as Ethereum
    blockTime: 12, // Same as Ethereum

    explorerUrl: 'https://etherscan.io',
    explorerTxPath: '/tx',
    explorerAddressPath: '/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48?a=',

    network: 'mainnet',
    networkId: 1,

    rpcUrl: process.env.ALCHEMY_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/',

    moonpayCurrencyCode: 'usdc_ethereum',

    color: '#2775CA', // USDC blue
    icon: '$',
  },

  // MVP-DEFERRED: XRP will be re-enabled post-MVP
  // /**
  //  * XRP Configuration
  //  *
  //  * - Coin type: 144 (BIP44 standard for XRP)
  //  * - Confirmations: 1 (XRP has instant finality)
  //  * - Uses XRP Ledger WebSocket for real-time monitoring
  //  */
  // XRP: {
  //   name: 'XRP',
  //   fullName: 'XRP Ledger',
  //   symbol: 'XRP',
  //   decimals: 6, // XRP uses 6 decimal places (drops)
  //
  //   coinType: 144, // BIP44 coin type for XRP
  //   confirmations: 1, // XRP has consensus finality, 1 confirmation is sufficient
  //   blockTime: 4, // Average 4 seconds per ledger close
  //
  //   explorerUrl: 'https://livenet.xrpl.org',
  //   explorerTxPath: '/transactions',
  //   explorerAddressPath: '/accounts',
  //
  //   network: 'mainnet',
  //
  //   rpcUrl: process.env.XRPL_WEBSOCKET_URL || 'wss://xrplcluster.com/',
  //
  //   moonpayCurrencyCode: 'xrp',
  //
  //   color: '#23292F', // XRP black
  //   icon: '✕',
  // },
};

/**
 * Helper function to get chain configuration
 *
 * @param chain - The blockchain identifier
 * @returns Chain configuration object
 * @throws Error if chain is not supported
 */
export function getChainConfig(chain: Chain): ChainConfig {
  const config = CHAIN_CONFIG[chain];

  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  return config;
}

/**
 * Get BIP44 derivation path for a chain
 *
 * BIP44 format: m / purpose' / coin_type' / account' / change / address_index
 * - purpose: 44 (BIP44 standard)
 * - coin_type: Different for each cryptocurrency
 * - account: Usually 0 (allows multiple "accounts" per seed)
 * - change: 0 for external (receiving), 1 for internal (change addresses)
 * - address_index: Sequential number for each address
 *
 * @param chain - The blockchain identifier
 * @param account - Account index (default: 0)
 * @param addressIndex - Address index (default: 0)
 * @returns BIP44 derivation path string
 */
export function getDerivationPath(
  chain: Chain,
  account: number = 0,
  addressIndex: number = 0
): string {
  const config = getChainConfig(chain);

  // BIP44 derivation path
  // Note: The apostrophe (') indicates hardened derivation
  return `m/44'/${config.coinType}'/${account}'/0/${addressIndex}`;
}

/**
 * Get block explorer URL for a transaction
 *
 * @param chain - The blockchain identifier
 * @param txHash - Transaction hash
 * @returns Full URL to view transaction on block explorer
 */
export function getExplorerTxUrl(chain: Chain, txHash: string): string {
  const config = getChainConfig(chain);
  return `${config.explorerUrl}${config.explorerTxPath}/${txHash}`;
}

/**
 * Get block explorer URL for an address
 *
 * @param chain - The blockchain identifier
 * @param address - Wallet address
 * @returns Full URL to view address on block explorer
 */
export function getExplorerAddressUrl(chain: Chain, address: string): string {
  const config = getChainConfig(chain);
  return `${config.explorerUrl}${config.explorerAddressPath}/${address}`;
}

/**
 * Format crypto amount with proper decimal places
 *
 * @param chain - The blockchain identifier
 * @param amount - Amount in smallest unit (satoshis, wei, drops)
 * @returns Formatted amount as string
 */
export function formatCryptoAmount(chain: Chain, amount: bigint | string): string {
  const config = getChainConfig(chain);
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;

  // Convert from smallest unit to main unit
  const divisor = BigInt(10 ** config.decimals);
  const whole = amountBigInt / divisor;
  const fractional = amountBigInt % divisor;

  // Format with proper decimal places
  const fractionalStr = fractional.toString().padStart(config.decimals, '0');

  return `${whole}.${fractionalStr}`;
}

/**
 * List of all supported chains
 * Useful for UI dropdowns and iteration
 *
 * MVP: BTC + USDC only
 */
export const SUPPORTED_CHAINS: Chain[] = ['BTC', 'USDC'];
// MVP-DEFERRED: export const SUPPORTED_CHAINS: Chain[] = ['BTC', 'ETH', 'USDC', 'XRP'];

/**
 * ERC-20 token contract addresses
 * For tokens deployed on Ethereum
 */
export const ERC20_CONTRACTS = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum mainnet
} as const;
