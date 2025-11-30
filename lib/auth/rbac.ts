/**
 * Role-Based Access Control (RBAC) Utilities
 *
 * This module provides functions to check permissions and enforce access control.
 * Used throughout the application to ensure users can only perform actions
 * they are authorized for.
 *
 * Security principles:
 * - Always check permissions server-side (never trust client)
 * - Fail closed (deny by default)
 * - Log authorization failures for security monitoring
 * - Use principle of least privilege
 */

import prisma from '@/lib/db/prisma';
import {
  UserRole,
  Permission,
  hasPermission as configHasPermission,
  hasAnyPermission as configHasAnyPermission,
  hasAllPermissions as configHasAllPermissions,
} from '@/config/permissions';
import { createAuditLog } from '@/lib/security/auditLog';

/**
 * Get user's role in a specific church
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @returns User's role in the church, or null if not a member
 */
export async function getUserRoleInChurch(
  userId: string,
  churchId: string
): Promise<UserRole | null> {
  const churchUser = await prisma.churchUser.findUnique({
    where: {
      churchId_userId: {
        churchId,
        userId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  // User not found or inactive
  if (!churchUser || !churchUser.isActive) {
    return null;
  }

  return churchUser.role as UserRole;
}

/**
 * Check if user has a specific permission in a church
 *
 * This is the primary authorization function used throughout the application.
 * Always call this server-side before performing sensitive operations.
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @param permission - Required permission
 * @returns True if user has the permission
 *
 * @example
 * const canCreateWallet = await userHasPermission(
 *   userId,
 *   churchId,
 *   Permission.WALLET_CREATE
 * );
 *
 * if (!canCreateWallet) {
 *   throw new Error('Insufficient permissions');
 * }
 */
export async function userHasPermission(
  userId: string,
  churchId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRoleInChurch(userId, churchId);

  if (!role) {
    return false;
  }

  return configHasPermission(role, permission);
}

/**
 * Check if user has any of the specified permissions (OR logic)
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one permission
 */
export async function userHasAnyPermission(
  userId: string,
  churchId: string,
  permissions: Permission[]
): Promise<boolean> {
  const role = await getUserRoleInChurch(userId, churchId);

  if (!role) {
    return false;
  }

  return configHasAnyPermission(role, permissions);
}

/**
 * Check if user has all specified permissions (AND logic)
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export async function userHasAllPermissions(
  userId: string,
  churchId: string,
  permissions: Permission[]
): Promise<boolean> {
  const role = await getUserRoleInChurch(userId, churchId);

  if (!role) {
    return false;
  }

  return configHasAllPermissions(role, permissions);
}

/**
 * Require permission or throw error
 *
 * Convenience function that throws an error if permission check fails.
 * Use in API routes for clean error handling.
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @param permission - Required permission
 * @param ipAddress - IP address for audit log (optional)
 * @throws Error if user doesn't have permission
 *
 * @example
 * await requirePermission(
 *   userId,
 *   churchId,
 *   Permission.WALLET_CREATE,
 *   request.ip
 * );
 * // If we get here, user has permission - proceed with operation
 */
export async function requirePermission(
  userId: string,
  churchId: string,
  permission: Permission,
  ipAddress?: string
): Promise<void> {
  const hasPermission = await userHasPermission(userId, churchId, permission);

  if (!hasPermission) {
    // Log authorization failure for security monitoring
    await createAuditLog({
      action: 'AUTHORIZATION_FAILED',
      userId,
      churchId,
      resource: 'Permission',
      ipAddress,
      metadata: {
        requiredPermission: permission,
        reason: 'Insufficient permissions',
      },
    });

    throw new Error(`Insufficient permissions: ${permission} required`);
  }
}

/**
 * Require any permission or throw error
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @param permissions - Array of permissions (user needs at least one)
 * @param ipAddress - IP address for audit log (optional)
 * @throws Error if user doesn't have any of the permissions
 */
export async function requireAnyPermission(
  userId: string,
  churchId: string,
  permissions: Permission[],
  ipAddress?: string
): Promise<void> {
  const hasPermission = await userHasAnyPermission(userId, churchId, permissions);

  if (!hasPermission) {
    await createAuditLog({
      action: 'AUTHORIZATION_FAILED',
      userId,
      churchId,
      resource: 'Permission',
      ipAddress,
      metadata: {
        requiredPermissions: permissions,
        reason: 'Insufficient permissions (requires any)',
      },
    });

    throw new Error(`Insufficient permissions: one of [${permissions.join(', ')}] required`);
  }
}

/**
 * Check if user is a member of a church
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @returns True if user is an active member
 */
export async function isChurchMember(userId: string, churchId: string): Promise<boolean> {
  const churchUser = await prisma.churchUser.findUnique({
    where: {
      churchId_userId: {
        churchId,
        userId,
      },
    },
    select: {
      isActive: true,
    },
  });

  return !!churchUser?.isActive;
}

/**
 * Require church membership or throw error
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @throws Error if user is not a member
 */
export async function requireChurchMembership(
  userId: string,
  churchId: string
): Promise<void> {
  const isMember = await isChurchMember(userId, churchId);

  if (!isMember) {
    throw new Error('User is not a member of this church');
  }
}

/**
 * Get all churches user belongs to
 *
 * @param userId - User ID
 * @returns Array of churches with user's role in each
 */
export async function getUserChurches(userId: string) {
  const churchUsers = await prisma.churchUser.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      church: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          subscriptionTier: true,
          subscriptionStatus: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return churchUsers.map((cu) => ({
    ...cu.church,
    role: cu.role,
    joinedAt: cu.createdAt,
  }));
}

/**
 * Check if user can manage another user (based on role hierarchy)
 *
 * Rules:
 * - ADMIN can manage TREASURER and MEMBER
 * - TREASURER cannot manage anyone
 * - MEMBER cannot manage anyone
 * - Cannot demote yourself
 *
 * @param actorUserId - User performing the action
 * @param targetUserId - User being managed
 * @param churchId - Church ID
 * @returns True if actor can manage target
 */
export async function canManageUser(
  actorUserId: string,
  targetUserId: string,
  churchId: string
): Promise<boolean> {
  // Cannot manage yourself
  if (actorUserId === targetUserId) {
    return false;
  }

  const actorRole = await getUserRoleInChurch(actorUserId, churchId);
  const targetRole = await getUserRoleInChurch(targetUserId, churchId);

  if (!actorRole || !targetRole) {
    return false;
  }

  // Only ADMIN can manage users
  if (actorRole !== UserRole.ADMIN) {
    return false;
  }

  // ADMIN can manage TREASURER and MEMBER (but not other ADMIN in this simple model)
  return targetRole !== UserRole.ADMIN;
}

/**
 * Check subscription tier and feature access
 *
 * Used to enforce subscription limits (e.g., max wallets, max users)
 *
 * @param churchId - Church ID
 * @returns Church subscription info
 */
export async function getChurchSubscription(churchId: string) {
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
    },
  });

  if (!church) {
    throw new Error('Church not found');
  }

  return church;
}

/**
 * Check if church subscription is active
 *
 * @param churchId - Church ID
 * @returns True if subscription is active or in trial
 */
export async function hasActiveSubscription(churchId: string): Promise<boolean> {
  const subscription = await getChurchSubscription(churchId);

  return (
    subscription.subscriptionStatus === 'ACTIVE' ||
    subscription.subscriptionStatus === 'TRIAL'
  );
}

/**
 * Require active subscription or throw error
 *
 * @param churchId - Church ID
 * @throws Error if subscription is not active
 */
export async function requireActiveSubscription(churchId: string): Promise<void> {
  const isActive = await hasActiveSubscription(churchId);

  if (!isActive) {
    throw new Error(
      'Church subscription is not active. Please update your subscription to continue.'
    );
  }
}
