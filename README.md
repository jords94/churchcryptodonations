# Church Crypto Donations Platform

A secure, user-friendly web platform enabling churches to receive cryptocurrency donations from congregation members. Built with Next.js 14, TypeScript, and modern Web3 technologies.

## 🚀 Features

- **Multi-Chain Support**: Accept donations in Bitcoin (BTC), Ethereum (ETH), USD Coin (USDC), and XRP
- **Non-Custodial Security**: Churches control their own private keys via seed phrases
- **Real-Time USD Conversion**: View wallet balances in USD with live price feeds
- **QR Code Generation**: Create customizable QR codes for easy donation collection
- **MoonPay Integration**: On-ramp, off-ramp, and swap crypto with a single provider
- **Role-Based Access Control**: Admin, Treasurer, and Member roles with granular permissions
- **Transaction Monitoring**: Real-time blockchain monitoring with confirmation tracking
- **Educational Resources**: Interactive tutorials and glossary for non-technical users
- **Subscription Tiers**: Basic, Pro, and Enterprise plans with Stripe billing
- **Comprehensive Audit Logs**: Full transparency and compliance tracking

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** (App Router) with TypeScript
- **React 18** for UI components
- **Tailwind CSS** + **shadcn/ui** for styling
- **Framer Motion** for animations
- **RainbowKit** for wallet connection

### Backend
- **Next.js API Routes** for serverless endpoints
- **Supabase** (PostgreSQL + Auth)
- **Prisma ORM** for type-safe database access
- **Redis** (Upstash) for caching and rate limiting

### Blockchain
- **viem** - Ethereum library (ETH, USDC)
- **bitcoinjs-lib** - Bitcoin wallet generation
- **xrpl** - XRP Ledger integration
- **Alchemy SDK** - Blockchain node provider
- **MoonPay SDK** - Crypto payment gateway

### Security
- **Supabase Auth** with MFA
- **OWASP Top 10** mitigation strategies
- **Winston** for structured logging
- **Sentry** for error tracking

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm/yarn/pnpm
- **PostgreSQL** database (or Supabase account)
- **Redis** instance (or Upstash account)

You'll also need API keys for:
- Supabase (database and auth)
- Alchemy (Ethereum blockchain access)
- Blockchair (Bitcoin blockchain access)
- MoonPay (crypto payments)
- Stripe (subscription billing)
- CoinGecko (price feeds)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/church-crypto-donations.git
cd church-crypto-donations
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys and configuration. See the [Environment Variables](#environment-variables) section for details.

### 4. Set up the database

Initialize Prisma and create the database schema:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or run migrations (production)
npx prisma migrate deploy
```

### 5. Seed the database (optional)

```bash
npm run db:seed
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📁 Project Structure

```
/church-crypto-donations
├── /app                    # Next.js 14 App Router
│   ├── /api               # API routes
│   ├── /dashboard         # Church admin dashboard
│   ├── /donate            # Donor-facing pages
│   └── layout.tsx         # Root layout
├── /components            # React components
│   ├── /ui               # shadcn/ui components
│   ├── /dashboard        # Dashboard components
│   └── /wallets          # Wallet components
├── /lib                  # Utility libraries
│   ├── /crypto          # Blockchain utilities
│   ├── /api             # API clients
│   ├── /auth            # Authentication
│   └── /security        # Security utilities
├── /config              # Configuration files
│   ├── chains.ts        # Blockchain configs
│   ├── permissions.ts   # RBAC definitions
│   └── constants.ts     # App constants
├── /prisma              # Database
│   └── schema.prisma    # Database schema
├── /public              # Static assets
└── package.json
```

## 🔐 Security Features

This platform implements comprehensive security measures aligned with OWASP Top 10:

1. **Broken Access Control**: RBAC middleware on all API routes, server-side permission checks
2. **Cryptographic Failures**: HTTPS everywhere, non-custodial wallets, seed phrases never stored
3. **Injection**: Prisma ORM (parameterized queries), Zod validation, input sanitization
4. **Insecure Design**: Non-custodial architecture, multi-step confirmations
5. **Security Misconfiguration**: Security headers, environment validation, dependency audits
6. **Vulnerable Components**: Regular npm audits, official crypto libraries only
7. **Auth Failures**: MFA, email verification, rate limiting, strong password policy
8. **Data Integrity**: Webhook signature validation, comprehensive audit logs
9. **Logging/Monitoring**: Winston structured logging, Sentry error tracking
10. **SSRF**: URL validation, domain whitelisting, official SDKs only

### Non-Custodial Wallet Security

**CRITICAL**: This platform uses a non-custodial approach:
- Seed phrases are **NEVER** stored in the database
- Churches control their own private keys
- Seed phrases are displayed **ONCE** during wallet creation
- Users must securely save their seed phrases
- We only store public wallet addresses

## 📊 Database Schema

The platform uses PostgreSQL with the following main models:

- **Church**: Organization information, subscription, settings
- **User**: User accounts with Supabase Auth
- **ChurchUser**: Many-to-many relationship with RBAC roles
- **Wallet**: Cryptocurrency wallets (public addresses only)
- **Transaction**: Donation records from blockchain
- **QRCode**: Generated QR codes for donations
- **MoonPayTransaction**: On-ramp/off-ramp tracking
- **AuditLog**: Security audit trail
- **Tutorial**: Educational content
- **UserProgress**: Onboarding tracking

View the complete schema in `prisma/schema.prisma`.

## 🔑 Environment Variables

Key environment variables (see `.env.example` for complete list):

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | Yes |
| `ALCHEMY_API_KEY` | Alchemy API key for Ethereum | Yes |
| `MOONPAY_API_KEY` | MoonPay API key | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `COINGECKO_API_KEY` | CoinGecko API key (optional) | No |
| `ENCRYPTION_KEY` | 32-byte hex key for encryption | Yes |

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy!

### Docker

```bash
# Build image
docker build -t church-crypto-donations .

# Run container
docker run -p 3000:3000 church-crypto-donations
```

## 🛠️ Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Format code with Prettier
npx prettier --write .

# Database commands
npm run db:push          # Push schema changes
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Type checking
npx tsc --noEmit
```

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [RBAC Permissions](./docs/rbac.md)
- [Blockchain Integration](./docs/blockchain.md)
- [Security Best Practices](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided for educational and operational purposes. Users are responsible for:
- Securely storing seed phrases and private keys
- Complying with local regulations regarding cryptocurrency
- Properly accounting for donations for tax purposes
- Understanding the risks of cryptocurrency volatility

## 🆘 Support

- 📧 Email: support@churchcryptodonations.com
- 📖 Documentation: https://docs.churchcryptodonations.com
- 💬 Discord: https://discord.gg/churchcrypto

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [RainbowKit](https://www.rainbowkit.com/)
- [MoonPay](https://www.moonpay.com/)
- [Stripe](https://stripe.com/)

---

Made with ❤️ for churches embracing the future of giving
