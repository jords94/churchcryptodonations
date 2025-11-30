/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * This file defines all permissions and their mappings to user roles.
 * Implements the principle of least privilege - users only get permissions
 * they need for their role.
 *
 * Security note: Always check permissions server-side. Never trust client-side checks.
 */

/**
 * User roles enum
 * Matches the Prisma UserRole enum for type safety
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  TREASURER = 'TREASURER',
  MEMBER = 'MEMBER',
}

/**
 * Permission categories and specific permissions
 * Organized by resource type for clarity
 */
export enum Permission {
  // === WALLET PERMISSIONS ===
  WALLET_VIEW = 'wallet:view', // View wallet addresses and balances
  WALLET_CREATE = 'wallet:create', // Create new wallets
  WALLET_DELETE = 'wallet:delete', // Delete/deactivate wallets
  WALLET_EXPORT = 'wallet:export', // Export wallet data

  // === QR CODE PERMISSIONS ===
  QR_VIEW = 'qr:view', // View QR codes
  QR_CREATE = 'qr:create', // Generate new QR codes
  QR_DELETE = 'qr:delete', // Delete QR codes

  // === TRANSACTION PERMISSIONS ===
  TRANSACTION_VIEW = 'transaction:view', // View transaction history
  TRANSACTION_EXPORT = 'transaction:export', // Export transactions (CSV, PDF)

  // === MOONPAY PERMISSIONS ===
  MOONPAY_OFFRAMP = 'moonpay:offramp', // Withdraw crypto to bank account
  MOONPAY_SWAP = 'moonpay:swap', // Swap between cryptocurrencies

  // === USER MANAGEMENT PERMISSIONS ===
  USER_VIEW = 'user:view', // View church members/users
  USER_INVITE = 'user:invite', // Invite new users to church
  USER_EDIT_ROLE = 'user:editRole', // Change user roles
  USER_REMOVE = 'user:remove', // Remove users from church

  // === CHURCH SETTINGS PERMISSIONS ===
  CHURCH_VIEW_SETTINGS = 'church:viewSettings', // View church settings
  CHURCH_EDIT_SETTINGS = 'church:editSettings', // Update church info (name, logo, etc.)
  CHURCH_MANAGE_SUBSCRIPTION = 'church:manageSubscription', // Manage Stripe subscription

  // === AUDIT LOG PERMISSIONS ===
  AUDIT_VIEW = 'audit:view', // View audit logs

  // === ANALYTICS PERMISSIONS ===
  ANALYTICS_VIEW = 'analytics:view', // View donation analytics
  ANALYTICS_EXPORT = 'analytics:export', // Export reports

  // === TRAINING PERMISSIONS ===
  TRAINING_VIEW = 'training:view', // View tutorials and training content
}

/**
 * Role-Permission Mapping
 *
 * Defines which permissions each role has access to.
 * This is the single source of truth for authorization decisions.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  /**
   * ADMIN Role
   *
   * Full access to all church functions. Typically the pastor or church administrator.
   * Can manage wallets, users, subscriptions, and perform all financial operations.
   */
  [UserRole.ADMIN]: [
    // Wallet permissions
    Permission.WALLET_VIEW,
    Permission.WALLET_CREATE,
    Permission.WALLET_DELETE,
    Permission.WALLET_EXPORT,

    // QR code permissions
    Permission.QR_VIEW,
    Permission.QR_CREATE,
    Permission.QR_DELETE,

    // Transaction permissions
    Permission.TRANSACTION_VIEW,
    Permission.TRANSACTION_EXPORT,

    // MoonPay permissions
    Permission.MOONPAY_OFFRAMP,
    Permission.MOONPAY_SWAP,

    // User management permissions
    Permission.USER_VIEW,
    Permission.USER_INVITE,
    Permission.USER_EDIT_ROLE,
    Permission.USER_REMOVE,

    // Church settings permissions
    Permission.CHURCH_VIEW_SETTINGS,
    Permission.CHURCH_EDIT_SETTINGS,
    Permission.CHURCH_MANAGE_SUBSCRIPTION,

    // Audit log permissions
    Permission.AUDIT_VIEW,

    // Analytics permissions
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,

    // Training permissions
    Permission.TRAINING_VIEW,
  ],

  /**
   * TREASURER Role
   *
   * Financial oversight role. Can view all financial data, manage transactions,
   * and perform off-ramping, but cannot manage users or church settings.
   * Typically the church treasurer or financial secretary.
   */
  [UserRole.TREASURER]: [
    // Wallet permissions (view only, cannot create/delete)
    Permission.WALLET_VIEW,
    Permission.WALLET_EXPORT,

    // QR code permissions (view and create for fundraising campaigns)
    Permission.QR_VIEW,
    Permission.QR_CREATE,

    // Transaction permissions
    Permission.TRANSACTION_VIEW,
    Permission.TRANSACTION_EXPORT,

    // MoonPay permissions (can withdraw funds)
    Permission.MOONPAY_OFFRAMP,
    Permission.MOONPAY_SWAP,

    // User management permissions (view only)
    Permission.USER_VIEW,

    // Church settings permissions (view only)
    Permission.CHURCH_VIEW_SETTINGS,

    // Audit log permissions
    Permission.AUDIT_VIEW,

    // Analytics permissions
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,

    // Training permissions
    Permission.TRAINING_VIEW,
  ],

  /**
   * MEMBER Role
   *
   * Read-only access for transparency. Can view wallets, transactions, and analytics
   * but cannot make any changes or perform financial operations.
   * Typically church board members or staff who need visibility.
   */
  [UserRole.MEMBER]: [
    // Wallet permissions (view only)
    Permission.WALLET_VIEW,

    // QR code permissions (view only)
    Permission.QR_VIEW,

    // Transaction permissions (view only)
    Permission.TRANSACTION_VIEW,

    // User management permissions (view only)
    Permission.USER_VIEW,

    // Church settings permissions (view only)
    Permission.CHURCH_VIEW_SETTINGS,

    // Analytics permissions (view only, cannot export)
    Permission.ANALYTICS_VIEW,

    // Training permissions
    Permission.TRAINING_VIEW,
  ],
};

/**
 * Check if a role has a specific permission
 *
 * @param role - User's role in the church
 * @param permission - Permission to check
 * @returns True if the role has the permission
 *
 * @example
 * hasPermission(UserRole.ADMIN, Permission.WALLET_CREATE) // true
 * hasPermission(UserRole.MEMBER, Permission.WALLET_DELETE) // false
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];

  if (!rolePermissions) {
    // Invalid role, deny access
    return false;
  }

  return rolePermissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions (OR logic)
 *
 * @param role - User's role in the church
 * @param permissions - Array of permissions to check
 * @returns True if the role has at least one of the permissions
 *
 * @example
 * hasAnyPermission(UserRole.TREASURER, [
 *   Permission.MOONPAY_OFFRAMP,
 *   Permission.USER_INVITE
 * ]) // true (has MOONPAY_OFFRAMP)
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions (AND logic)
 *
 * @param role - User's role in the church
 * @param permissions - Array of permissions to check
 * @returns True if the role has all of the permissions
 *
 * @example
 * hasAllPermissions(UserRole.ADMIN, [
 *   Permission.WALLET_VIEW,
 *   Permission.WALLET_CREATE
 * ]) // true
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 *
 * @param role - User's role in the church
 * @returns Array of all permissions the role has
 *
 * @example
 * getPermissions(UserRole.MEMBER) // [Permission.WALLET_VIEW, ...]
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can perform a specific action on a resource
 * Convenience function that maps common actions to permissions
 *
 * @param role - User's role
 * @param action - Action to perform (create, read, update, delete)
 * @param resource - Resource type (wallet, transaction, user, etc.)
 * @returns True if the role can perform the action
 */
export function canPerformAction(
  role: UserRole,
  action: 'create' | 'read' | 'update' | 'delete',
  resource: string
): boolean {
  // Map action + resource to permission enum
  const permissionKey = `${resource.toUpperCase()}_${action.toUpperCase()}` as keyof typeof Permission;
  const permission = Permission[permissionKey];

  if (!permission) {
    // Permission doesn't exist for this action/resource combination
    return false;
  }

  return hasPermission(role, permission);
}

/**
 * Role hierarchy levels
 * Higher number = more permissions
 * Useful for UI to determine if a user can assign/change roles
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.MEMBER]: 1,
  [UserRole.TREASURER]: 2,
  [UserRole.ADMIN]: 3,
};

/**
 * Check if one role has higher privileges than another
 *
 * @param role1 - First role
 * @param role2 - Second role
 * @returns True if role1 has higher or equal privileges than role2
 *
 * @example
 * canManageRole(UserRole.ADMIN, UserRole.MEMBER) // true
 * canManageRole(UserRole.MEMBER, UserRole.ADMIN) // false
 */
export function canManageRole(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}
