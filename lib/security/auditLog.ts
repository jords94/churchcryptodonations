/**
 * Audit Logging System
 *
 * Provides comprehensive audit trail for security monitoring and compliance.
 * All critical operations should be logged for:
 * - Security incident investigation
 * - Regulatory compliance
 * - Church financial transparency
 * - Troubleshooting
 *
 * OWASP Top 10 - Security Logging and Monitoring (#9)
 */

import prisma from '@/lib/db/prisma';
import { AUDIT } from '@/config/constants';

/**
 * Audit log entry data structure
 */
export interface AuditLogData {
  action: string; // Action performed (use constants from AUDIT.ACTIONS)
  userId?: string; // User who performed the action
  churchId?: string; // Church context
  resource: string; // Resource type (Wallet, User, Transaction, etc.)
  resourceId?: string; // Specific resource ID
  ipAddress?: string; // IP address of user
  userAgent?: string; // Browser/device information
  metadata?: Record<string, any>; // Additional context (old values, new values, etc.)
}

/**
 * Create an audit log entry
 *
 * This function should be called for all sensitive operations including:
 * - Authentication (login, logout, password reset)
 * - Wallet operations (create, delete, export)
 * - Financial operations (withdraw, swap)
 * - User management (invite, role change, remove)
 * - Settings changes
 *
 * @param data - Audit log data
 * @returns Created audit log entry
 *
 * @example
 * await createAuditLog({
 *   action: AUDIT.ACTIONS.WALLET_CREATED,
 *   userId: user.id,
 *   churchId: church.id,
 *   resource: 'Wallet',
 *   resourceId: wallet.id,
 *   ipAddress: request.ip,
 *   metadata: {
 *     chain: 'BTC',
 *     address: wallet.address
 *   }
 * });
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId,
        churchId: data.churchId,
        resource: data.resource,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata || {},
      },
    });

    return auditLog;
  } catch (error) {
    // Log to console but don't throw - audit logging should never break the app
    console.error('Failed to create audit log:', error);
    console.error('Audit data:', data);

    // In production, you might want to send this to an external logging service
    // like Sentry or DataDog to ensure audit logs are never lost
  }
}

/**
 * Create audit log for authentication events
 *
 * Convenience function for login, logout, and password reset events
 *
 * @param action - Auth action (LOGIN_SUCCESS, LOGIN_FAILED, etc.)
 * @param userId - User ID (null for failed login)
 * @param email - Email address used
 * @param ipAddress - IP address
 * @param userAgent - User agent string
 * @param success - Whether the action was successful
 * @param failureReason - Reason for failure (if applicable)
 */
export async function logAuthEvent(
  action: string,
  userId: string | null,
  email: string,
  ipAddress?: string,
  userAgent?: string,
  success: boolean = true,
  failureReason?: string
) {
  await createAuditLog({
    action,
    userId: userId || undefined,
    resource: 'Authentication',
    ipAddress,
    userAgent,
    metadata: {
      email,
      success,
      failureReason: failureReason || undefined,
    },
  });
}

/**
 * Create audit log for wallet operations
 *
 * @param action - Wallet action (WALLET_CREATED, WALLET_DELETED, etc.)
 * @param userId - User performing the action
 * @param churchId - Church ID
 * @param walletId - Wallet ID
 * @param chain - Blockchain
 * @param address - Wallet address
 * @param ipAddress - IP address
 * @param additionalMetadata - Extra context
 */
export async function logWalletEvent(
  action: string,
  userId: string,
  churchId: string,
  walletId: string,
  chain: string,
  address: string,
  ipAddress?: string,
  additionalMetadata?: Record<string, any>
) {
  await createAuditLog({
    action,
    userId,
    churchId,
    resource: 'Wallet',
    resourceId: walletId,
    ipAddress,
    metadata: {
      chain,
      address,
      ...additionalMetadata,
    },
  });
}

/**
 * Create audit log for transaction events
 *
 * @param action - Transaction action
 * @param churchId - Church ID
 * @param transactionId - Transaction ID
 * @param txHash - Blockchain transaction hash
 * @param chain - Blockchain
 * @param amountCrypto - Amount in crypto
 * @param amountUsd - Amount in USD
 * @param additionalMetadata - Extra context
 */
export async function logTransactionEvent(
  action: string,
  churchId: string,
  transactionId: string,
  txHash: string,
  chain: string,
  amountCrypto: string,
  amountUsd: string,
  additionalMetadata?: Record<string, any>
) {
  await createAuditLog({
    action,
    churchId,
    resource: 'Transaction',
    resourceId: transactionId,
    metadata: {
      txHash,
      chain,
      amountCrypto,
      amountUsd,
      ...additionalMetadata,
    },
  });
}

/**
 * Create audit log for user management events
 *
 * @param action - User action (USER_INVITED, USER_ROLE_CHANGED, etc.)
 * @param actorUserId - User performing the action
 * @param targetUserId - User being affected
 * @param churchId - Church ID
 * @param ipAddress - IP address
 * @param changes - What changed (role, status, etc.)
 */
export async function logUserManagementEvent(
  action: string,
  actorUserId: string,
  targetUserId: string,
  churchId: string,
  ipAddress?: string,
  changes?: Record<string, any>
) {
  await createAuditLog({
    action,
    userId: actorUserId,
    churchId,
    resource: 'User',
    resourceId: targetUserId,
    ipAddress,
    metadata: {
      targetUserId,
      changes,
    },
  });
}

/**
 * Create audit log for MoonPay operations
 *
 * @param action - MoonPay action (FUNDS_WITHDRAWN, CRYPTO_SWAPPED)
 * @param userId - User performing the action
 * @param churchId - Church ID
 * @param moonpayTxId - MoonPay transaction ID
 * @param type - Transaction type (BUY, SELL, SWAP)
 * @param fromCurrency - Source currency
 * @param toCurrency - Destination currency
 * @param amount - Amount
 * @param ipAddress - IP address
 */
export async function logMoonPayEvent(
  action: string,
  userId: string,
  churchId: string,
  moonpayTxId: string,
  type: string,
  fromCurrency: string,
  toCurrency: string,
  amount: string,
  ipAddress?: string
) {
  await createAuditLog({
    action,
    userId,
    churchId,
    resource: 'MoonPayTransaction',
    resourceId: moonpayTxId,
    ipAddress,
    metadata: {
      type,
      fromCurrency,
      toCurrency,
      amount,
    },
  });
}

/**
 * Query audit logs
 *
 * @param filters - Filter criteria
 * @param limit - Number of results (default: 100)
 * @param offset - Pagination offset
 * @returns Audit log entries
 */
export async function queryAuditLogs(
  filters: {
    churchId?: string;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  offset: number = 0
) {
  const where: any = {};

  if (filters.churchId) where.churchId = filters.churchId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    hasMore: offset + logs.length < total,
  };
}

/**
 * Delete old audit logs (for retention policy)
 *
 * Should be run periodically (e.g., monthly cron job)
 * Default retention: 90 days (configurable in constants)
 *
 * @param retentionDays - Number of days to retain logs
 * @returns Number of logs deleted
 */
export async function cleanupOldAuditLogs(
  retentionDays: number = AUDIT.RETENTION_DAYS
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`Deleted ${result.count} audit logs older than ${retentionDays} days`);

  return result.count;
}

/**
 * Get audit log statistics for a church
 *
 * Useful for security dashboards and monitoring
 *
 * @param churchId - Church ID
 * @param days - Number of days to analyze (default: 30)
 * @returns Audit statistics
 */
export async function getAuditStatistics(churchId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.setDate(startDate.getDate() - days));

  const logs = await prisma.auditLog.findMany({
    where: {
      churchId,
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      action: true,
      resource: true,
      createdAt: true,
    },
  });

  // Count by action
  const byAction: Record<string, number> = {};
  logs.forEach((log) => {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });

  // Count by resource
  const byResource: Record<string, number> = {};
  logs.forEach((log) => {
    byResource[log.resource] = (byResource[log.resource] || 0) + 1;
  });

  // Count by day
  const byDay: Record<string, number> = {};
  logs.forEach((log) => {
    const day = log.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  return {
    total: logs.length,
    byAction,
    byResource,
    byDay,
    period: {
      startDate,
      endDate: new Date(),
      days,
    },
  };
}
