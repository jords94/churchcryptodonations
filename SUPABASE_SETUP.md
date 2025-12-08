# Supabase Setup Guide - 5 Minutes ⏱️

The app will load with dummy credentials, but **signup and authentication won't work** until you set up Supabase (it's free!).

---

## Quick Setup (Free Tier)

### 1️⃣ Create Supabase Account

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub (easiest) or email

### 2️⃣ Create New Project

1. Click **"New Project"**
2. Fill in project details:
   - **Name:** `church-crypto-dev` (or any name you want)
   - **Database Password:** Click "Generate a password" (SAVE THIS!)
   - **Region:** Choose closest to you (e.g., `us-east-1`)
   - **Pricing Plan:** Free (perfect for development)
3. Click **"Create new project"**
4. ⏳ Wait ~2 minutes for project to provision

### 3️⃣ Get API Credentials

Once your project is ready:

1. Go to **Settings** (gear icon in sidebar) → **API**
2. You'll see three important values:

**Copy these to `.env.local`:**

```env
# Project URL (at the top)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# API Keys section
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# (The "anon public" key)

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# (The "service_role" key - keep this secret!)
```

### 4️⃣ Get Database Connection Strings

1. Go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab

**For DATABASE_URL (Session pooling):**
- Click the **"Session pooling"** button
- Copy the connection string
- Replace `[YOUR-PASSWORD]` with your database password
- Add `?pgbouncer=true` at the end

```env
DATABASE_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**For DIRECT_URL (Direct connection):**
- Click the **"Direct connection"** button
- Copy the connection string
- Replace `[YOUR-PASSWORD]` with your database password

```env
DIRECT_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-1.compute.amazonaws.com:5432/postgres"
```

### 5️⃣ Update `.env.local`

Open `/Users/jordan/builds/churchcryptodonations/.env.local` and replace the dummy values:

```env
# Replace these lines with your real values from steps 3 & 4:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-real-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-real-service-key-here
DATABASE_URL="postgresql://postgres:your-password@..."
DIRECT_URL="postgresql://postgres:your-password@..."
```

### 6️⃣ Push Database Schema

Run this command to create all the tables in Supabase:

```bash
npx prisma db push
```

Expected output:
```
✔ Generated Prisma Client
✔ The database is now in sync with your schema
```

### 7️⃣ Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

You should see in the terminal:
```
✅ Supabase connected
```

Instead of:
```
⚠️  Warning: Using placeholder Supabase credentials
```

---

## ✅ Verify It's Working

### Test 1: Homepage Loads

- Go to http://localhost:3000
- Should load without errors

### Test 2: Signup Page Loads

- Go to http://localhost:3000/auth/signup
- Should see form with all fields (including Church name)

### Test 3: Create Account

Fill in the form:
- **Full name:** Test User
- **Church name:** Test Church
- **Email:** test@example.com
- **Password:** TestPassword123!
- **Confirm password:** TestPassword123!

Click "Create account"

**If Supabase is configured correctly:**
- ✅ Success message appears
- ✅ Email sent for verification (check spam folder)
- ✅ Records created in database

**Check terminal logs:**
```
🔍 Signup request received for: test@example.com
✅ Supabase user created: [uuid]
✅ User record created
✅ Church record created: [id], slug: test-church
✅ ChurchUser link created: [id], role: ADMIN
🎉 SIGNUP COMPLETE
```

### Test 4: Verify Database

Open Prisma Studio to see your data:

```bash
npx prisma studio
```

Or check in Supabase dashboard:
1. Go to **Table Editor**
2. You should see tables: `User`, `Church`, `ChurchUser`, `Wallet`, `Transaction`, etc.
3. Check the `User` table - you should see your test user
4. Check the `Church` table - you should see "Test Church"

---

## 🎯 What Supabase Provides

Supabase gives us:

1. **Authentication** - User signup, login, email verification
2. **PostgreSQL Database** - Stores users, churches, wallets, transactions
3. **Connection Pooling** - Handles multiple concurrent connections
4. **Row Level Security** - Built-in security policies
5. **Real-time subscriptions** - (not used in MVP but available)
6. **Storage** - For church logos (planned for future)

---

## 🔒 Security Notes

- ✅ **NEVER commit `.env.local`** to git (it's in `.gitignore`)
- ✅ **Service role key** has admin access - keep it secret
- ✅ **Anon key** is safe to expose to client (has limited permissions)
- ✅ Use **different projects** for development vs production

---

## 💰 Pricing (Free Tier Limits)

Supabase Free Tier includes:

- ✅ 500 MB database space
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ Social OAuth providers
- ✅ 7-day log retention

**Perfect for MVP development!**

---

## 🆘 Troubleshooting

### Issue: "Invalid API key" error

**Solution:**
- Make sure you copied the **full** key (they're very long)
- Check for extra spaces or line breaks
- Verify you're using the correct project

### Issue: "Database connection failed"

**Solution:**
- Verify your database password is correct
- Check that `?pgbouncer=true` is at the end of DATABASE_URL
- Make sure your Supabase project is active (not paused)

### Issue: "prisma db push" fails

**Solution:**
- Check your DIRECT_URL is correct
- Verify your database password
- Make sure you're using the **direct connection** string (port 5432, not 6543)

### Issue: Supabase project paused

**Solution:**
- Free tier projects pause after 1 week of inactivity
- Just click "Resume" in the Supabase dashboard
- Or upgrade to Pro ($25/month) for always-on

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js + Supabase Guide:** https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

---

## ✨ Once Setup is Complete

You can:

1. ✅ **Test signup flow** - Create accounts and churches
2. ✅ **Test login** - Sign in with created accounts
3. ✅ **Create wallets** - Generate BTC and USDC addresses
4. ✅ **View in dashboard** - See all your church data
5. ✅ **Generate QR codes** - For accepting donations

**The app is now fully functional!** 🎉
