# Automated Balance Updates Setup Guide

This guide explains how to set up automated wallet balance updates for your church crypto donation platform.

## Table of Contents

1. [Overview](#overview)
2. [Quick Setup (5 minutes)](#quick-setup-5-minutes)
3. [Deployment Options](#deployment-options)
4. [Testing](#testing)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### How It Works

```
Every 10 minutes (configurable):
  ↓
Cron Job triggers /api/cron/update-balances
  ↓
API checks all active wallets
  ↓
Queries blockchain APIs:
  • BTC → blockchain.info (free, no rate limit)
  • USDC → Alchemy (300M compute units/month free)
  ↓
Updates database with new balances
  ↓
Dashboard shows updated balances automatically
```

### Current Support (MVP)

| Chain | API Provider | Cost | Rate Limit | Status |
|-------|-------------|------|------------|--------|
| **BTC** | blockchain.info | Free ✅ | Reasonable use | ✅ Active |
| **USDC** | Alchemy | Free ✅ | 300M CU/month | ✅ Active |
| **ETH** | Alchemy | Free ✅ | Same as USDC | 🔵 Deferred |
| **XRP** | XRP Ledger | Free ✅ | Public nodes | 🔵 Deferred |

**Note:** ETH and XRP were deferred in your MVP simplification. You can add them back later.

---

## Quick Setup (5 minutes)

### Step 1: Generate Cron Secret

```bash
# Generate a secure random secret
openssl rand -hex 32
```

Copy the output (e.g., `a3f2c9e1b4d7...`)

### Step 2: Add to Environment Variables

Add to your `.env.local`:

```bash
# Add these lines
CRON_SECRET=paste_your_secret_here
ALCHEMY_API_KEY=your_alchemy_key_here  # If not already added
```

### Step 3: Test Manually

```bash
# Start your dev server
npm run dev

# In another terminal, test the endpoint
curl -X GET http://localhost:3000/api/cron/update-balances \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

You should see:
```json
{
  "success": true,
  "timestamp": "2025-12-07T03:15:00.000Z",
  "stats": {
    "totalWallets": 1,
    "updated": 1,
    "failed": 0,
    "duration": "2.34s"
  }
}
```

### Step 4: Choose Deployment Method

Pick one based on where you're hosting:

- **Vercel** → [See Vercel Setup](#vercel-recommended)
- **Self-hosted** → [See Self-hosted Setup](#self-hosted-vps-or-local)
- **GitHub Actions** → [See GitHub Actions Setup](#github-actions)

---

## Deployment Options

### Vercel (Recommended)

**Already configured!** The `vercel.json` file is set up.

#### Setup:

1. **Deploy to Vercel:**
   ```bash
   vercel
   ```

2. **Add Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `CRON_SECRET` = your generated secret
     - `ALCHEMY_API_KEY` = your Alchemy key
     - `DATABASE_URL` = your database URL
     - `DIRECT_URL` = your direct database URL

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

4. **Verify:**
   - Vercel will automatically run the cron every 10 minutes
   - Check logs: Vercel Dashboard → Your Project → Logs

#### Configuration:

Current schedule in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-balances",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**To change frequency:**
- Every 5 minutes: `"*/5 * * * *"`
- Every 15 minutes: `"*/15 * * * *"`
- Every 30 minutes: `"*/30 * * * *"`
- Every hour: `"0 * * * *"`

**Vercel Cron Limits:**
- Free: 100 executions/day
- Pro: 1000 executions/day
- **10 min intervals** = 144 executions/day ✅ Within free limit

---

### Self-hosted (VPS or Local)

For servers running Ubuntu/Debian/macOS.

#### Option A: System Crontab

1. **Add CRON_SECRET to .env.local:**
   ```bash
   echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
   ```

2. **Create cron script:**
   ```bash
   nano ~/update-balances.sh
   ```

   Add:
   ```bash
   #!/bin/bash
   CRON_SECRET=$(grep CRON_SECRET /path/to/your/project/.env.local | cut -d '=' -f2)
   curl -X GET http://localhost:3000/api/cron/update-balances \
     -H "Authorization: Bearer $CRON_SECRET" \
     -s -o /dev/null -w "%{http_code}\n" >> /var/log/balance-updates.log 2>&1
   ```

3. **Make executable:**
   ```bash
   chmod +x ~/update-balances.sh
   ```

4. **Add to crontab:**
   ```bash
   crontab -e
   ```

   Add (every 10 minutes):
   ```cron
   */10 * * * * /home/youruser/update-balances.sh
   ```

5. **Verify:**
   ```bash
   # Check if cron is running
   sudo service cron status

   # Check logs
   tail -f /var/log/balance-updates.log
   ```

#### Option B: PM2 (Process Manager)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Create update script:**
   ```bash
   nano ~/balance-updater.js
   ```

   Add:
   ```javascript
   const fetch = require('node-fetch');

   async function updateBalances() {
     const CRON_SECRET = process.env.CRON_SECRET;
     const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

     try {
       const response = await fetch(`${APP_URL}/api/cron/update-balances`, {
         headers: {
           'Authorization': `Bearer ${CRON_SECRET}`
         }
       });

       const data = await response.json();
       console.log(new Date().toISOString(), 'Update result:', data);
     } catch (error) {
       console.error(new Date().toISOString(), 'Update failed:', error);
     }
   }

   // Run every 10 minutes
   setInterval(updateBalances, 10 * 60 * 1000);

   // Run immediately on start
   updateBalances();
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ~/balance-updater.js --name balance-updater
   pm2 save
   pm2 startup  # Enable on boot
   ```

4. **Monitor:**
   ```bash
   pm2 logs balance-updater
   ```

---

### GitHub Actions

Good for Vercel/Netlify deployments or as backup to built-in cron.

1. **Create `.github/workflows/update-balances.yml`:**

```yaml
name: Update Wallet Balances

on:
  schedule:
    # Every 10 minutes
    - cron: '*/10 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  update-balances:
    runs-on: ubuntu-latest

    steps:
      - name: Call update endpoint
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/update-balances \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -f || exit 1
```

2. **Add secrets to GitHub:**
   - Go to: Repository → Settings → Secrets → Actions
   - Add:
     - `APP_URL`: Your production URL (e.g., `https://yourapp.vercel.app`)
     - `CRON_SECRET`: Your cron secret

3. **Enable:**
   - Commit and push the workflow file
   - GitHub will automatically run it every 10 minutes

4. **Monitor:**
   - Check: Repository → Actions → Update Wallet Balances

**GitHub Actions Limits:**
- Free: 2,000 minutes/month
- Each run takes ~10 seconds
- **10 min intervals** = ~24 hours of compute time/month ✅ Well within limit

---

## Testing

### Manual Test

```bash
# Get your cron secret
grep CRON_SECRET .env.local

# Test locally (dev server must be running)
curl -X GET http://localhost:3000/api/cron/update-balances \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test production
curl -X GET https://yourapp.vercel.app/api/cron/update-balances \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Expected Response (Success)

```json
{
  "success": true,
  "timestamp": "2025-12-07T03:20:00.000Z",
  "stats": {
    "totalWallets": 3,
    "updated": 3,
    "failed": 0,
    "duration": "4.12s"
  }
}
```

### Expected Response (Error)

```json
{
  "success": false,
  "error": "ALCHEMY_API_KEY not configured",
  "timestamp": "2025-12-07T03:20:00.000Z"
}
```

### Verify in Dashboard

1. Check a wallet before cron runs - note the balance
2. Send a test transaction to that wallet
3. Wait for cron to run (or trigger manually)
4. Refresh dashboard - balance should be updated!

---

## Monitoring

### Vercel Dashboard

- Go to: Vercel Dashboard → Your Project → Logs
- Filter by: `/api/cron/update-balances`
- Check for errors or successful runs

### Self-hosted Logs

```bash
# If using crontab
tail -f /var/log/balance-updates.log

# If using PM2
pm2 logs balance-updater

# Application logs (if you added file logging)
tail -f /var/log/church-crypto-donations.log
```

### Database Check

```bash
# Check last update times
npx tsx scripts/check-wallet-addresses.ts

# Or query directly
npx prisma studio
# Look at Wallet table → lastBalanceUpdate field
```

### Set Up Alerts (Optional)

For production, consider setting up alerts for failed updates:

1. **Email alerts** (SendGrid)
2. **Slack notifications**
3. **Error tracking** (Sentry)

Example: Modify `/api/cron/update-balances` to send alerts on failure.

---

## Troubleshooting

### Issue: "Unauthorized" (401 error)

**Cause:** Incorrect or missing CRON_SECRET

**Fix:**
```bash
# Check if secret is set
echo $CRON_SECRET

# Or in .env.local
grep CRON_SECRET .env.local

# Regenerate if needed
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
```

### Issue: "ALCHEMY_API_KEY not configured"

**Cause:** Missing Alchemy API key for USDC balance checks

**Fix:**
```bash
# Add to .env.local
echo "ALCHEMY_API_KEY=your_key_here" >> .env.local

# Or in Vercel dashboard
# Settings → Environment Variables → Add ALCHEMY_API_KEY
```

### Issue: Blockchair 430 errors

**Cause:** Rate limiting (shouldn't happen with blockchain.info fallback)

**Fix:** Already handled! The system automatically falls back to blockchain.info

### Issue: Cron not running on Vercel

**Check:**
1. Is `vercel.json` in the root directory?
2. Did you redeploy after adding it?
3. Are you on a paid plan? (Free tier has cron support)
4. Check Vercel Dashboard → Your Project → Settings → Cron Jobs

**Fix:**
```bash
# Redeploy
vercel --prod
```

### Issue: Balances not updating

**Debug steps:**

1. **Test endpoint manually:**
   ```bash
   curl -X GET http://localhost:3000/api/cron/update-balances \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Check if transactions are confirmed:**
   - Bitcoin needs 1+ confirmations (~10 min)
   - Check on: https://blockchain.info/address/YOUR_ADDRESS

3. **Verify API keys:**
   ```bash
   # Should see both
   grep ALCHEMY_API_KEY .env.local
   grep CRON_SECRET .env.local
   ```

4. **Check database connection:**
   ```bash
   npx prisma studio
   # Verify wallets exist and are active
   ```

---

## Conservative Testing Schedule

For testing, here's a recommended schedule:

| Phase | Frequency | Duration | Purpose |
|-------|-----------|----------|---------|
| **Initial Testing** | Every 5 min | 1 hour | Verify it works |
| **Test Period** | Every 10 min | 1 week | Monitor stability |
| **Production** | Every 10 min | Ongoing | Standard operation |

**Current Setting:** Every 10 minutes (144 updates/day)

This is conservative because:
- ✅ Bitcoin blocks every ~10 min
- ✅ Well within all API limits
- ✅ Catches new donations quickly
- ✅ Low server load

---

## Summary

### ✅ What's Set Up:

- `/api/cron/update-balances` endpoint created
- `vercel.json` configured for Vercel deployments
- Automatic fallback to blockchain.info for BTC
- Updates every 10 minutes (configurable)

### 📋 What You Need To Do:

1. **Generate and add CRON_SECRET:**
   ```bash
   echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
   ```

2. **Add ALCHEMY_API_KEY** (if not done):
   ```bash
   echo "ALCHEMY_API_KEY=your_key" >> .env.local
   ```

3. **Choose deployment method:**
   - Vercel: Deploy with `vercel --prod`
   - Self-hosted: Set up crontab
   - GitHub Actions: Add workflow file

4. **Test it works:**
   ```bash
   curl -X GET http://localhost:3000/api/cron/update-balances \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

5. **Monitor for 24 hours** to ensure it's working correctly

### 🚀 Next Steps:

Once automated updates are running:
- Monitor dashboard for accurate balances
- Send test transactions and verify they appear
- Consider adding email notifications for new donations
- Set up error monitoring (Sentry)

---

**Need help?** Check the logs or run manual updates with:
```bash
npx tsx scripts/update-wallet-balances.ts
```
