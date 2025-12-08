# Installation Guide - Church Crypto Donations MVP

## Quick Start

Follow these steps to get the development server running:

### 1. Install Dependencies

```bash
npm install
```

**Note:** The MVP version has removed the following packages that were deferred:
- ❌ `@moonpay/moonpay-sdk` (doesn't exist in npm)
- ❌ `stripe` (payment processing - deferred)
- ❌ `@rainbow-me/rainbowkit` (wallet connection UI - deferred)
- ❌ `wagmi` (Ethereum hooks - deferred)
- ❌ `alchemy-sdk` (blockchain API - deferred)
- ❌ `ioredis` (Redis client - deferred)
- ❌ `rate-limiter-flexible` (advanced rate limiting - deferred)
- ❌ `winston` (logging - using console.log)
- ❌ `@sentry/nextjs` (error tracking - deferred)
- ❌ `intro.js-react` (product tours - deferred)

✅ **Kept for MVP:**
- Crypto libraries: `bitcoinjs-lib`, `bip39`, `bip32`, `viem`, `xrpl`
- Supabase & Prisma
- UI components (Radix, Tailwind)
- Form libraries (react-hook-form, Zod)
- QR code generation

### 2. Set Up Environment Variables

Create `.env.local` in the project root:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: Skip email verification for development
SKIP_EMAIL_VERIFICATION="true"
```

**Where to find Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Settings → Database → Connection string (get DATABASE_URL and DIRECT_URL)
4. Settings → API → Project URL and API Keys

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Push Database Schema

```bash
npx prisma db push
```

Or run migrations:

```bash
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run dev
```

Expected output:
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
- Ready in 2.5s
```

### 6. Open Browser

Navigate to: **http://localhost:3000**

---

## Verification Checklist

### ✅ Installation Successful If:

1. **npm install** completes without errors
2. **npx prisma generate** creates `.prisma/client`
3. **npm run dev** starts server on port 3000
4. Browser shows the homepage (no 500 errors)
5. Can navigate to `/auth/signup` and see form with:
   - Full name field
   - Church name field ← Should be present
   - Email field
   - Password field (with strength indicator)
   - Confirm password field

### ❌ Common Issues

**Issue: "Module not found" errors**
- Solution: Run `npm install` again
- Verify `node_modules` folder exists

**Issue: "Cannot find module '@prisma/client'"**
- Solution: Run `npx prisma generate`

**Issue: "Database connection error"**
- Solution: Verify DATABASE_URL in `.env.local`
- Test connection: `npx prisma db push`

**Issue: "Port 3000 already in use"**
- Solution: Kill existing process on port 3000
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```
  Or use different port:
  ```bash
  PORT=3001 npm run dev
  ```

**Issue: "Supabase connection failed"**
- Solution: Verify Supabase credentials in `.env.local`
- Check that Supabase project is active
- Verify API keys are not expired

---

## Testing the Signup Flow

Once the server is running:

### Manual Browser Test:

1. Navigate to: `http://localhost:3000/auth/signup`

2. Fill in the form:
   - **Full name:** Test User
   - **Church name:** Test Church
   - **Email:** test@example.com
   - **Password:** TestPassword123!
   - **Confirm password:** TestPassword123!

3. Click "Create account"

4. **Open browser console (F12)** - Look for:
   ```
   📝 Signup form submitted: { name: "Test User", churchName: "Test Church", email: "test@example.com" }
   📡 Signup API response status: 201
   ```

5. **Check terminal** - Look for:
   ```
   🔍 Signup request received for: test@example.com
   ✅ Validation passed
   ✅ Supabase user created: [id]
   🏗️  Creating database records in transaction
   ✅ User record created: [id]
   ✅ Church record created: [id], slug: test-church
   ✅ ChurchUser link created: [id], role: ADMIN
   📝 Audit log entry created
   🎉 SIGNUP COMPLETE - User and church created successfully
   ```

6. Success message should appear:
   ```
   "Registration successful! Your church has been created.
   Please check your email to verify your account."
   ```

### Automated API Test:

```bash
npx tsx scripts/test-signup-api.ts
```

### Database Verification:

```bash
# Check user created
npx prisma studio
# Or use psql:
psql $DATABASE_URL -c "SELECT * FROM \"User\" WHERE email = 'test@example.com';"

# Check church created
psql $DATABASE_URL -c "SELECT * FROM \"Church\" WHERE email = 'test@example.com';"

# Check admin link
psql $DATABASE_URL -c "SELECT cu.role, c.name FROM \"ChurchUser\" cu JOIN \"Church\" c ON cu.\"churchId\" = c.id JOIN \"User\" u ON cu.\"userId\" = u.id WHERE u.email = 'test@example.com';"
```

Expected result:
- ✅ User record exists
- ✅ Church record exists with auto-generated slug
- ✅ ChurchUser record exists with `role = 'ADMIN'` and `isActive = true`
- ✅ Church has `enabledChains = ["BTC", "USDC"]`
- ✅ Church has `subscriptionStatus = 'TRIAL'`

---

## Next Steps After Installation

1. **Test signup flow** (see above)
2. **Test login** at `/auth/login`
3. **Create first wallet** at `/dashboard/wallets/create`
4. **Generate QR code** at `/donate/[church-slug]`

---

## Development Tools

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# View database schema
npx prisma studio

# Format code
npm run lint

# Run tests (if implemented)
npm test
```

---

## Troubleshooting

### Database Issues

If you need to reset the database:

```bash
# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Or drop tables manually in Supabase dashboard
```

### Prisma Issues

If Prisma client is out of sync:

```bash
# Regenerate Prisma client
npx prisma generate

# If schema changed, push to database
npx prisma db push
```

### Cache Issues

If you see stale data:

```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

---

## Production Deployment

For production deployment to Vercel:

1. **Connect GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard (same as .env.local)
3. **Deploy** - Vercel will automatically:
   - Run `npm install`
   - Run `npx prisma generate`
   - Run `npm run build`
   - Deploy to production

**Important:** Make sure to set production URLs:
```env
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

---

## Support

If you encounter issues not covered here:

1. Check the detailed documentation:
   - `/SIGNUP_FLOW_FIXED.md` - Signup flow details
   - `/CHURCH_CONTEXT_IMPLEMENTATION.md` - Auth context
   - `/WALLET_GENERATION_REVIEW.md` - Wallet generation

2. Check server logs for error messages

3. Verify all environment variables are set correctly

4. Ensure Supabase project is active and accessible
