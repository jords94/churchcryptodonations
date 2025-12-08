/**
 * Session Management Utilities
 *
 * Provides helper functions for managing user sessions, extracting
 * user context from requests, and enforcing authentication requirements.
 *
 * Works with Supabase Auth for session management.
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabase, getSupabaseAdmin, getCurrentUser, getCurrentSession } from './supabase';
import prisma from '@/lib/db/prisma';
import { logAuthEvent } from '@/lib/security/auditLog';

/**
 * User context from session
 * Includes Supabase auth user + our database user record
 */
export interface UserContext {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

/**
 * Get server-side Supabase client that reads from cookies
 * Use this in API routes to access authenticated sessions
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get user context from Authorization header or session
 *
 * Use in API routes - checks Bearer token first, then falls back to cookies
 *
 * @param request - Optional request object to check Authorization header
 * @returns User context or null if not authenticated
 */
export async function getUserContext(request?: Request): Promise<UserContext | null> {
  let email: string | undefined;

  // First, try to get user from Authorization header (Bearer token)
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseAdmin = getSupabaseAdmin();

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (user && !error) {
        email = user.email;
      }
    }
  }

  // If no token, try to get from cookies
  if (!email) {
    const supabase = await getServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    email = session.user.email;
  }

  if (!email) {
    return null;
  }

  // Get our database user record
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      mfaEnabled: true,
    },
  });

  if (!dbUser) {
    // User exists in Supabase but not in our database
    // This could happen if registration wasn't completed
    console.error('User exists in Supabase but not in database:', email);
    return null;
  }

  return dbUser;
}

/**
 * Require authenticated user or throw error
 *
 * Use in API routes and Server Actions that require authentication
 *
 * @param request - Optional request object to check Authorization header
 * @returns User context
 * @throws Error if not authenticated
 *
 * @example
 * // In API route:
 * const user = await requireAuth(request);
 * // If we get here, user is authenticated
 */
export async function requireAuth(request?: Request): Promise<UserContext> {
  const user = await getUserContext(request);

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Require email verification
 *
 * Some operations should only be allowed for verified users
 *
 * @param userId - User ID
 * @throws Error if email is not verified
 */
export async function requireEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified && process.env.SKIP_EMAIL_VERIFICATION !== 'true') {
    throw new Error('Email verification required. Please check your email.');
  }
}

/**
 * Get IP address from request
 *
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * @param request - Next.js request object
 * @returns IP address or 'unknown'
 */
export function getIPAddress(request: NextRequest): string {
  // Try various headers set by reverse proxies
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

/**
 * Get user agent from request
 *
 * @param request - Next.js request object
 * @returns User agent string or 'unknown'
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Create a new user in database after Supabase signup
 *
 * Should be called in the signup flow after Supabase creates the auth user
 *
 * @param email - User email
 * @param name - User name
 * @param supabaseUserId - Supabase auth user ID
 * @returns Created user
 */
export async function createDatabaseUser(
  email: string,
  name: string,
  supabaseUserId: string
) {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return existing;
  }

  // Create new user
  const user = await prisma.user.create({
    data: {
      id: supabaseUserId, // Use Supabase ID for consistency
      email,
      name,
      passwordHash: '', // Managed by Supabase
      emailVerified: false,
    },
  });

  return user;
}

/**
 * Update user's last login time
 *
 * @param userId - User ID
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

/**
 * Log successful login
 *
 * @param userId - User ID
 * @param email - User email
 * @param ipAddress - IP address
 * @param userAgent - User agent
 */
export async function logSuccessfulLogin(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await Promise.all([
    updateLastLogin(userId),
    logAuthEvent('LOGIN_SUCCESS', userId, email, ipAddress, userAgent, true),
  ]);
}

/**
 * Log failed login attempt
 *
 * @param email - Email used in login attempt
 * @param reason - Failure reason
 * @param ipAddress - IP address
 * @param userAgent - User agent
 */
export async function logFailedLogin(
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent('LOGIN_FAILED', null, email, ipAddress, userAgent, false, reason);
}

/**
 * Check if user has MFA enabled
 *
 * @param userId - User ID
 * @returns True if MFA is enabled
 */
export async function hasMFAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });

  return user?.mfaEnabled || false;
}

/**
 * Enable MFA for user
 *
 * @param userId - User ID
 */
export async function enableMFA(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });
}

/**
 * Disable MFA for user
 *
 * @param userId - User ID
 */
export async function disableMFA(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false },
  });
}

/**
 * Verify user owns a church (is a member)
 *
 * Common check before allowing church-specific operations
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @returns True if user is a member
 */
export async function verifyChurchOwnership(
  userId: string,
  churchId: string
): Promise<boolean> {
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

  return churchUser?.isActive || false;
}

/**
 * Require church ownership or throw error
 *
 * @param userId - User ID
 * @param churchId - Church ID
 * @throws Error if user is not a member
 */
export async function requireChurchOwnership(
  userId: string,
  churchId: string
): Promise<void> {
  const isOwner = await verifyChurchOwnership(userId, churchId);

  if (!isOwner) {
    throw new Error('You do not have access to this church');
  }
}
