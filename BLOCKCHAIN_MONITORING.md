# Blockchain Monitoring & Balance Updates

This document explains how Bitcoin and cryptocurrency wallet balances are monitored and updated in the system.

## Table of Contents

1. [How It Currently Works](#how-it-currently-works)
2. [Validating BTC Addresses](#validating-btc-addresses)
3. [Balance Update Frequency](#balance-update-frequency)
4. [Setting Up Automated Monitoring](#setting-up-automated-monitoring)
5. [API Keys Required](#api-keys-required)
6. [Testing & Verification](#testing--verification)

---

## How It Currently Works

### Current State (MVP)

**Important:** In the current MVP implementation:
- ✅ Wallet addresses are generated correctly
- ✅ Addresses are validated before storage
- ❌ **Balance monitoring is NOT automatic**
- ❌ **Balances always show $0.00**

The system only stores wallet addresses in the database. Balance updates must be run manually using the scripts provided.

### Architecture

```
┌─────────────────────┐
│   User Dashboard    │
│  (Shows balances)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Database        │
│  balanceCrypto: "0" │
│  balanceUsd: "0"    │
│  lastBalanceUpdate  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐        ┌──────────────────┐
│  Balance Monitor    │───────▶│ Blockchain APIs  │
│   (Cron Script)     │        │ - Blockchair     │
│                     │        │ - Alchemy        │
│                     │        │ - CoinGecko      │
└─────────────────────┘        └──────────────────┘
```

---

## Validating BTC Addresses

### Quick Validation Test

Run this script to validate an address is working correctly:

```bash
# Generate a new test address and validate it
npx tsx scripts/validate-btc-address.ts

# Validate a specific address from your database
npx tsx scripts/validate-btc-address.ts bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```

### What the Script Checks

1. **Local Format Validation**
   - ✅ Valid Bitcoin address format
   - ✅ Correct address type (Native SegWit bc1...)
   - ✅ Proper length and structure

2. **Blockchain Verification**
   - ✅ Address exists on Bitcoin blockchain
   - ✅ Current balance (if any)
   - ✅ Transaction history
   - ✅ Total received/spent amounts

3. **Explorer Links**
   - Provides links to view address on multiple explorers
   - Blockchair, Blockchain.info, Mempool.space

### Example Output

```
BITCOIN ADDRESS VALIDATION
======================================================================

Address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

📋 Step 1: Local Format Validation
----------------------------------------------------------------------
  • Valid Format: ✅ YES
  • Address Type: Native SegWit (Bech32) - RECOMMENDED
  • Length: 42 characters

🔍 Step 2: Blockchain Explorer Checks
----------------------------------------------------------------------
Checking Blockchair API...
  ✅ Address found on blockchain!

  Balance: 0.00123456 BTC
  Balance (satoshis): 123456
  Balance (USD): $45.67
  Total Received: 0.5 BTC
  Total Spent: 0.49876544 BTC
  Transaction Count: 12

VALIDATION SUMMARY
======================================================================
✅ Address format: VALID
✅ Address type: Native SegWit (Bech32) - RECOMMENDED
✅ Blockchain status: ACTIVE (has transactions)
💰 Current balance: 0.00123456 BTC ($45.67)

🔗 View on Explorers:
   • Blockchair: https://blockchair.com/bitcoin/address/bc1q...
   • Blockchain.info: https://blockchain.info/address/bc1q...
   • Mempool.space: https://mempool.space/address/bc1q...
```

### Manual Testing Procedure

1. **Generate a wallet** in the app (dashboard → wallets → create wallet)
2. **Copy the BTC address** from the wallet details
3. **Run validation script**:
   ```bash
   npx tsx scripts/validate-btc-address.ts YOUR_ADDRESS_HERE
   ```
4. **Send a test transaction** (optional):
   - Send 0.0001 BTC (~$4-5) to the address
   - Wait 10-20 minutes for 1 confirmation
   - Run validation script again to see the balance

---

## Balance Update Frequency

### Current Status: Manual Updates Only

⚠️ **Important:** Balances are NOT updated automatically in the MVP. You must run the update script manually.

### Recommended Polling Frequency

When you set up automated monitoring:

| Blockchain | Block Time | Recommended Interval | API Cost |
|-----------|------------|---------------------|----------|
| **Bitcoin (BTC)** | ~10 minutes | **Every 5-10 minutes** | Low (144-288 requests/day) |
| **Ethereum/USDC** | ~12 seconds | **Every 1-2 minutes** | Medium (720-1440 requests/day) |
| **Combined** | N/A | **Every 5 minutes** | Low-Medium (288 requests/day) |

### Why These Intervals?

- **Bitcoin (10 min blocks):** Checking every 5-10 minutes catches new blocks quickly without wasting API calls
- **Ethereum (12 sec blocks):** Checking every 1-2 minutes balances responsiveness with API costs
- **Combined strategy:** Every 5 minutes is a good middle ground for both chains

### API Rate Limits

Free tier limits (per day):

| Provider | Free Limit | Notes |
|----------|-----------|-------|
| **Blockchair** | 1,440 requests/day | 1 per minute sustained |
| **Alchemy** | 300 million compute units | ~100k requests/day |
| **CoinGecko** | 50 calls/minute | ~72k requests/day |

A single update cycle uses:
- 1 Blockchair request per BTC wallet
- 1 Alchemy request per USDC wallet
- 2 CoinGecko requests (BTC + ETH prices)

**Example:** 5 wallets (3 BTC, 2 USDC) updating every 5 minutes = 288 cycles/day
- Blockchair: 864 requests (within limit ✅)
- Alchemy: 576 requests (within limit ✅)
- CoinGecko: 576 requests (within limit ✅)

---

## Setting Up Automated Monitoring

### Option 1: Manual Updates (Current MVP)

Update all wallets manually:

```bash
npx tsx scripts/update-wallet-balances.ts
```

Update specific wallet:

```bash
npx tsx scripts/update-wallet-balances.ts --wallet cm12345abc
```

Update all wallets for a church:

```bash
npx tsx scripts/update-wallet-balances.ts --church cm67890xyz
```

### Option 2: Cron Job (Recommended for Production)

Edit your crontab:

```bash
crontab -e
```

Add this line to update every 5 minutes:

```cron
*/5 * * * * cd /path/to/churchcryptodonations && npx tsx scripts/update-wallet-balances.ts >> /var/log/wallet-balances.log 2>&1
```

Verify cron is running:

```bash
crontab -l
tail -f /var/log/wallet-balances.log
```

### Option 3: GitHub Actions (For Vercel/Cloud Deployments)

Create `.github/workflows/update-balances.yml`:

```yaml
name: Update Wallet Balances

on:
  schedule:
    # Run every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  update-balances:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci

      - name: Update balances
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BLOCKCHAIR_API_KEY: ${{ secrets.BLOCKCHAIR_API_KEY }}
          ALCHEMY_API_KEY: ${{ secrets.ALCHEMY_API_KEY }}
          COINGECKO_API_KEY: ${{ secrets.COINGECKO_API_KEY }}
        run: npx tsx scripts/update-wallet-balances.ts
```

### Option 4: Vercel Cron Jobs

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/update-balances",
    "schedule": "*/5 * * * *"
  }]
}
```

Create API endpoint `app/api/cron/update-balances/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updateAllWalletBalances } from '@/lib/blockchain/balanceMonitor';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await updateAllWalletBalances();

  return NextResponse.json({
    success: result.success,
    totalWallets: result.totalWallets,
    totalUpdated: result.totalUpdated,
    totalFailed: result.totalFailed,
    duration: result.duration,
  });
}
```

---

## API Keys Required

### 1. Blockchair (Bitcoin) - Optional but Recommended

**Free Tier:** 1,440 requests/day (1 per minute)

Get API key: https://blockchair.com/api

Add to `.env.local`:
```bash
BLOCKCHAIR_API_KEY=your_key_here
```

Without API key: Still works, but rate limited to 1 request per second.

### 2. Alchemy (Ethereum/USDC) - REQUIRED

**Free Tier:** 300 million compute units/month (~100k requests)

Get API key: https://dashboard.alchemy.com

Add to `.env.local`:
```bash
ALCHEMY_API_KEY=your_key_here
```

### 3. CoinGecko (Price Data) - Optional

**Free Tier:** 50 calls/minute

Get API key: https://www.coingecko.com/en/api/pricing

Add to `.env.local`:
```bash
COINGECKO_API_KEY=your_key_here
```

Without API key: Still works, but more aggressive rate limiting.

---

## Testing & Verification

### 1. Test Address Generation

```bash
npx tsx scripts/test-wallet-generation.ts
```

This verifies:
- ✅ Correct address formats (bc1 for BTC, 0x for USDC)
- ✅ Valid derivation paths
- ✅ Mainnet configuration
- ✅ Deterministic derivation

### 2. Validate a Specific Address

```bash
npx tsx scripts/validate-btc-address.ts bc1qYOUR_ADDRESS
```

This checks:
- ✅ Address format validity
- ✅ Blockchain existence
- ✅ Current balance
- ✅ Transaction history

### 3. Test Balance Updates

```bash
# Update all wallets (dry run)
npx tsx scripts/update-wallet-balances.ts

# Update specific wallet
npx tsx scripts/update-wallet-balances.ts --wallet WALLET_ID
```

### 4. Full Integration Test

1. **Create a test wallet** in the dashboard
2. **Validate the address**:
   ```bash
   npx tsx scripts/validate-btc-address.ts YOUR_ADDRESS
   ```
3. **Send a small test amount** (0.0001 BTC or $5 USDC)
4. **Wait for confirmation** (~10 min for BTC, ~2 min for USDC)
5. **Run balance update**:
   ```bash
   npx tsx scripts/update-wallet-balances.ts --wallet WALLET_ID
   ```
6. **Check dashboard** - balance should now show correctly!

---

## Troubleshooting

### Balances Always Show $0.00

**Problem:** Balances never update from $0.00

**Solution:** Balance monitoring is manual in MVP. Run:
```bash
npx tsx scripts/update-wallet-balances.ts
```

### API Rate Limit Errors

**Problem:** "Too many requests" or 429 errors

**Solutions:**
- Add API keys to `.env.local` for higher limits
- Reduce polling frequency
- Use paid tier for API providers

### Address Not Found on Blockchain

**Problem:** "Address valid but no transactions yet"

**Solution:** This is normal for new addresses. Send a test transaction to verify it works.

### Alchemy API Key Missing

**Problem:** "ALCHEMY_API_KEY not configured"

**Solution:**
1. Sign up at https://dashboard.alchemy.com
2. Create a new app (Ethereum Mainnet)
3. Copy API key to `.env.local`
4. Restart your application

---

## Summary

### To Validate BTC Addresses:
```bash
npx tsx scripts/validate-btc-address.ts YOUR_ADDRESS
```

### Current Balance Update Frequency:
- ❌ **Manual only** (MVP)
- ✅ **Every 5 minutes recommended** (production with cron)

### To Set Up Automated Updates:
1. Get API keys (Alchemy required, others optional)
2. Add to `.env.local`
3. Set up cron job or GitHub Actions
4. Monitor logs to verify it's working

### Recommended Production Setup:
- **Polling Interval:** Every 5 minutes
- **API Keys:** Alchemy (required) + Blockchair (recommended)
- **Monitoring:** Cron job with log rotation
- **Alerts:** Set up error notifications for failed updates
