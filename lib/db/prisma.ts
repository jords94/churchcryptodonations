/**
 * Prisma Client Singleton
 *
 * This file ensures we only create ONE instance of PrismaClient across the application.
 * Creating multiple instances can exhaust database connections, especially in development
 * with Next.js hot reloading.
 *
 * Best practices:
 * - Single instance in production
 * - Reuse instance in development (stored on global object)
 * - Proper connection pooling
 * - Graceful shutdown handling
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global type augmentation for Prisma client
 * Allows us to store Prisma instance on global object in development
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma client configuration
 *
 * Log levels:
 * - query: Log all database queries (useful for debugging, disable in production)
 * - error: Log database errors
 * - warn: Log warnings
 * - info: Log info messages
 */
const prismaClientOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? (['query', 'error', 'warn'] as const)
      : (['error'] as const),
};

/**
 * Create or reuse Prisma client instance
 *
 * In development:
 * - Store instance on global object to survive hot reloads
 * - Prevents "too many connections" errors
 *
 * In production:
 * - Create new instance once
 * - Vercel/serverless platforms handle connection pooling
 */
const prisma = global.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;

/**
 * Graceful shutdown handler
 *
 * Ensures database connections are properly closed when the application stops.
 * Important for:
 * - Preventing connection leaks
 * - Clean deployments
 * - Testing environments
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Register shutdown handler for clean exit
if (process.env.NODE_ENV !== 'test') {
  process.on('beforeExit', async () => {
    await disconnectPrisma();
  });
}
