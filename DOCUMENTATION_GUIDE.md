# Church Crypto Donations - Documentation Guide for Beginners

## 📚 Table of Contents
1. [Project Overview](#project-overview)
2. [Understanding the Codebase Structure](#codebase-structure)
3. [Key Concepts for Beginners](#key-concepts)
4. [API Documentation](#api-documentation)
5. [Component Guide](#component-guide)
6. [Security Features Explained](#security-features)
7. [Common Patterns](#common-patterns)

---

## 🎯 Project Overview

### What is This Platform?
Church Crypto Donations is a web application that helps churches accept cryptocurrency donations (Bitcoin, Ethereum, USDC, and XRP) from their congregation members.

### Why Does This Exist?
- **Problem**: Traditional donation methods (cash, checks) are declining
- **Solution**: Enable churches to accept modern payment methods (crypto)
- **Benefit**: Reach younger donors, enable global giving, reduce fees

### How It Works (Simple Flow)
1. **Church Signs Up** → Creates an account on the platform
2. **Creates Wallets** → Generates secure cryptocurrency wallets
3. **Generates QR Codes** → Creates scannable codes for each campaign
4. **Shares QR Codes** → Displays in bulletins, on screens, etc.
5. **Donors Scan & Give** → People scan with their crypto wallet apps
6. **Church Receives Funds** → Directly to their non-custodial wallet

---

## 📁 Codebase Structure

### Directory Layout
```
churchcryptodonations/
├── app/                          # Main application pages
│   ├── page.tsx                 # Home/landing page
│   ├── layout.tsx               # Root layout (wraps all pages)
│   ├── auth/                    # Authentication pages
│   │   ├── login/page.tsx      # Login form page
│   │   └── signup/page.tsx     # Sign-up form page
│   ├── dashboard/               # Protected dashboard area
│   │   ├── wallets/            # Wallet management
│   │   └── qrcodes/            # QR code management
│   ├── donate/                  # Public donation pages
│   └── api/                     # Backend API routes
│       ├── auth/               # Authentication APIs
│       ├── wallets/            # Wallet creation APIs
│       └── qrcodes/            # QR code management APIs
├── components/                  # Reusable UI components
│   ├── ui/                     # Basic UI elements (buttons, inputs)
│   └── qrcode/                 # QR code specific components
├── lib/                        # Utility functions and libraries
│   ├── auth/                   # Authentication utilities
│   ├── crypto/                 # Cryptocurrency wallet generation
│   ├── db/                     # Database client
│   └── security/               # Security utilities
└── config/                     # Configuration files
```

### File Naming Conventions
- `page.tsx` → A web page that users can visit
- `route.ts` → An API endpoint (backend function)
- `layout.tsx` → Wrapper that applies to multiple pages
- Component files → Start with capital letter (Button.tsx)
- Utility files → Lowercase (validation.ts)

---

## 🧠 Key Concepts for Beginners

### What is React?
React is a JavaScript library for building user interfaces. Think of it like LEGO blocks for websites:
- **Components** = Individual LEGO pieces
- **Pages** = Complete LEGO creations
- **Props** = How you customize each piece

### What is Next.js?
Next.js is a framework built on top of React that adds:
- **Routing** → Different URLs show different pages automatically
- **API Routes** → Backend code in the same project
- **Server-Side Rendering** → Faster page loads
- **File-based routing** → `/app/dashboard/page.tsx` becomes `/dashboard`

### What is TypeScript?
TypeScript is JavaScript with types:
```typescript
// JavaScript (no types)
function add(a, b) {
  return a + b;
}

// TypeScript (with types)
function add(a: number, b: number): number {
  return a + b;
}
```
**Why?** Catches bugs before code runs. Your editor shows errors as you type!

### What is Tailwind CSS?
Instead of writing CSS in separate files, you use utility classes:
```html
<!-- Traditional CSS -->
<div class="my-custom-button">Click me</div>
<style>.my-custom-button { padding: 10px; background: blue; }</style>

<!-- Tailwind CSS -->
<div class="p-4 bg-blue-500">Click me</div>
```

---

## 🔌 API Documentation

### Authentication APIs

#### POST /api/auth/login
**Purpose**: Log in an existing user

**Request Body**:
```json
{
  "email": "user@church.org",
  "password": "securePassword123!",
  "rememberMe": true
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_123",
    "email": "user@church.org",
    "name": "John Smith"
  },
  "session": {
    "accessToken": "eyJhbG...",
    "refreshToken": "v1.Mr5d...",
    "expiresAt": 1234567890
  }
}
```

**Error Response (401)**:
```json
{
  "error": "Authentication failed",
  "message": "Invalid email or password."
}
```

**Security Features**:
- Rate limited to 5 attempts per 15 minutes per IP
- Generic error messages (don't reveal if email exists)
- All attempts logged for security monitoring
- Requires email verification

---

#### POST /api/auth/signup
**Purpose**: Register a new user

**Request Body**:
```json
{
  "name": "John Smith",
  "email": "john@church.org",
  "password": "MyS3cur3P@ssw0rd!"
}
```

**Password Requirements**:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "user": {
    "id": "user_456",
    "email": "john@church.org"
  }
}
```

**Security Features**:
- Rate limited to 3 signups per hour per IP
- Strong password enforcement
- Email verification required before login
- Passwords hashed using bcrypt (never stored plain-text)

---

### Wallet APIs

#### POST /api/wallets/create
**Purpose**: Generate a new cryptocurrency wallet

**Request Body**:
```json
{
  "churchId": "church_789",
  "chain": "BTC",
  "label": "Sunday Offerings"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "wallet": {
    "id": "wallet_101",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "chain": "BTC",
    "label": "Sunday Offerings"
  },
  "mnemonic": "abandon ability able about above absent absorb abstract absurd abuse access accident",
  "warning": "CRITICAL: Save your seed phrase immediately! This is the ONLY time it will be shown."
}
```

**CRITICAL SECURITY NOTE**:
- The `mnemonic` (seed phrase) is shown **ONLY ONCE**
- It is **NEVER** stored in our database
- If lost, funds are **PERMANENTLY INACCESSIBLE**
- This is a feature, not a bug (non-custodial security)

**Supported Chains**:
- `BTC` - Bitcoin
- `ETH` - Ethereum
- `USDC` - USD Coin (stablecoin on Ethereum)
- `XRP` - Ripple

---

### QR Code APIs

#### POST /api/qrcodes/create
**Purpose**: Create a donation QR code

**Request Body**:
```json
{
  "walletId": "wallet_101",
  "churchId": "church_789",
  "campaignName": "Building Fund 2024",
  "suggestedAmount": "25",
  "customMessage": "Help us build our new community center!",
  "foregroundColor": "#000000",
  "backgroundColor": "#FFFFFF",
  "includeLogo": true,
  "errorCorrectionLevel": "H"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "qrCode": {
    "id": "qr_202",
    "campaignName": "Building Fund 2024",
    "url": "https://yoursite.com/donate/qr_202",
    "suggestedAmount": "25",
    "isActive": true
  }
}
```

---

## 🧩 Component Guide

### Button Component
**Location**: `components/ui/button.tsx`

**Purpose**: Reusable button with consistent styling

**Basic Usage**:
```tsx
<Button>Click Me</Button>
```

**With Variants**:
```tsx
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Subtle</Button>
```

**With Sizes**:
```tsx
<Button size="sm">Small</Button>
<Button size="default">Normal</Button>
<Button size="lg">Large</Button>
```

---

### Input Component
**Location**: `components/ui/input.tsx`

**Purpose**: Styled text input with accessibility features

**Basic Usage**:
```tsx
<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**Types**:
- `type="text"` - Regular text
- `type="email"` - Email with validation
- `type="password"` - Hidden text
- `type="number"` - Numeric input

---

### QRCodeDisplay Component
**Location**: `components/qrcode/QRCodeDisplay.tsx`

**Purpose**: Renders scannable QR codes for crypto payments

**Usage**:
```tsx
<QRCodeDisplay
  address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  chain="BTC"
  amount="0.001"
  label="Sunday Offerings"
  size={256}
  foregroundColor="#000000"
  backgroundColor="#FFFFFF"
/>
```

**How It Works**:
1. Takes wallet address and optional amount
2. Generates payment URI (e.g., `bitcoin:address?amount=0.001`)
3. Encodes URI into QR code using `qrcode.react` library
4. Displays scannable code with download/copy options

---

## 🔒 Security Features Explained

### 1. Rate Limiting
**What**: Limits how many requests someone can make
**Why**: Prevents brute force attacks (trying millions of passwords)
**How**: Tracks requests by IP address, blocks after threshold

**Example Limits**:
- Login: 5 attempts per 15 minutes
- Signup: 3 attempts per hour
- Wallet creation: 5 per hour per user

---

### 2. Input Validation
**What**: Checks all data before processing
**Why**: Prevents SQL injection, XSS, and other attacks
**How**: Uses Zod schemas to validate structure and types

**Example**:
```typescript
// ❌ Without validation
const email = request.body.email; // Could be anything!

// ✅ With validation
const email = loginSchema.parse(request.body).email; // Must be valid email
```

---

### 3. Non-Custodial Wallets
**What**: We never control user funds
**Why**: Maximum security - we can't be hacked for funds we don't have
**How**: Seed phrases never stored, generated on-demand and shown once

**Traditional Banks** (Custodial):
- Bank holds your money
- You trust them not to lose it
- If bank is hacked, money at risk

**Our Platform** (Non-Custodial):
- You hold your money
- We just help you generate a wallet
- If we're hacked, your funds are safe

---

### 4. Audit Logging
**What**: Record of all important actions
**Why**: Detect suspicious activity, investigate breaches
**How**: Every login, wallet creation, etc. is logged with IP and timestamp

**Logged Events**:
- Login attempts (success & failure)
- Wallet creations
- QR code changes
- Permission changes

---

## 🎨 Common Patterns

### Pattern 1: API Error Handling
**Every API route follows this pattern**:
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Validate input
    const validatedData = schema.parse(await request.json());

    // 2. Check permissions
    await requirePermission(userId, resource);

    // 3. Perform operation
    const result = await doSomething(validatedData);

    // 4. Return success
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    // 5. Handle errors appropriately
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

---

### Pattern 2: React Form Handling
**Most forms use react-hook-form + Zod**:
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

export default function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    // Data is validated here!
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

---

### Pattern 3: Database Queries with Prisma
**Consistent pattern for data access**:
```typescript
// Create
const user = await prisma.user.create({
  data: { email, name, passwordHash },
});

// Read
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, name: true }, // Only get what you need
});

// Update
await prisma.user.update({
  where: { id: userId },
  data: { lastLogin: new Date() },
});

// Delete (soft delete preferred)
await prisma.user.update({
  where: { id: userId },
  data: { isActive: false },
});
```

---

## 📖 Learning Resources

### For Complete Beginners
1. **HTML/CSS**: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Learn)
2. **JavaScript**: [JavaScript.info](https://javascript.info/)
3. **React**: [React Official Tutorial](https://react.dev/learn)

### For This Project
1. **Next.js**: [Next.js Documentation](https://nextjs.org/docs)
2. **TypeScript**: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
3. **Tailwind CSS**: [Tailwind Documentation](https://tailwindcss.com/docs)
4. **Prisma**: [Prisma Guide](https://www.prisma.io/docs/getting-started)

### Cryptocurrency Basics
1. **Bitcoin**: [Bitcoin.org](https://bitcoin.org/en/getting-started)
2. **Ethereum**: [Ethereum.org](https://ethereum.org/en/developers/docs/)
3. **Wallet Security**: [Learn about seed phrases](https://www.ledger.com/academy/crypto/what-is-a-recovery-phrase)

---

## ❓ Frequently Asked Questions

### Q: Where should I start if I'm new to the codebase?
**A**: Start with:
1. `app/page.tsx` - Simple homepage
2. `components/ui/button.tsx` - Basic component
3. `app/api/auth/login/route.ts` - Simple API endpoint

### Q: How do I add a new page?
**A**: Create a new `page.tsx` file in the `app/` directory:
```
app/
  about/
    page.tsx  → Creates /about route
```

### Q: How do I add a new API endpoint?
**A**: Create a new `route.ts` file in `app/api/`:
```
app/
  api/
    myendpoint/
      route.ts  → Creates /api/myendpoint
```

### Q: What's the difference between `.ts` and `.tsx`?
**A**:
- `.ts` = Regular TypeScript (no JSX/HTML)
- `.tsx` = TypeScript with JSX (can return HTML-like code)

### Q: Why do some imports start with `@/`?
**A**: `@/` is an alias for the project root directory:
- `@/components/Button` = `/components/Button`
- `@/lib/utils` = `/lib/utils`
It makes imports cleaner and easier to refactor.

---

## 🚀 Next Steps

After understanding this documentation:
1. **Read the code** - Start with simple files and work up
2. **Run locally** - See it in action (`npm run dev`)
3. **Make small changes** - Modify text, colors, etc.
4. **Build a feature** - Try adding a simple new page
5. **Ask questions** - Comments in code explain the "why"

Remember: **Every expert was once a beginner!** Take your time, read carefully, and don't be afraid to experiment.
