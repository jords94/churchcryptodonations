/**
 * Supabase Client Configuration
 *
 * Supabase provides authentication, database, and storage services.
 * This file configures both client-side and server-side Supabase clients.
 *
 * Two types of clients:
 * 1. Client-side: Uses anon key, runs in browser (limited permissions)
 * 2. Server-side: Uses service role key, runs on server (admin permissions)
 *
 * Security note:
 * - NEVER expose service role key to client
 * - Service role bypasses Row Level Security (RLS)
 * - Use anon key for client-side operations only
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Environment variable validation
 * Ensures required Supabase credentials are present
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only warn about missing credentials in development
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy')) {
    console.warn('⚠️  Warning: Using placeholder Supabase credentials');
    console.warn('⚠️  Signup and authentication will NOT work');
    console.warn('⚠️  Set up Supabase: https://supabase.com (free tier available)');
    console.warn('⚠️  See .env.local for setup instructions');
  }
}

/**
 * Client-side Supabase client
 *
 * Safe to use in browser with anon key.
 * Used for:
 * - User authentication (login, signup, logout)
 * - Client-side queries with RLS
 * - Real-time subscriptions
 *
 * Permissions controlled by Row Level Security (RLS) policies
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Auto-refresh tokens before expiry
    autoRefreshToken: true,
    // Persist session in local storage
    persistSession: true,
    // Detect when user is on another tab and sync sessions
    detectSessionInUrl: true,
  },
});

/**
 * Server-side Supabase client (Admin)
 *
 * SECURITY WARNING:
 * - Only use on server-side (API routes, Server Components)
 * - Bypasses all Row Level Security policies
 * - Has full database access
 *
 * Used for:
 * - Admin operations (user management, role changes)
 * - Server-side authentication verification
 * - Background jobs and cron tasks
 *
 * @returns Supabase client with admin privileges
 * @throws Error if service role key is not configured
 */
export function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    console.warn('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not configured');
    console.warn('⚠️  Admin operations will fail. Set up Supabase to fix this.');
    // Return a client with the anon key as fallback (will have limited permissions)
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get current authenticated user
 *
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }

  return user;
}

/**
 * Get current session
 *
 * @returns Session object if authenticated, null otherwise
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}

/**
 * Sign out current user
 *
 * Clears session from local storage and invalidates tokens
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Check if user's email is verified
 *
 * @param userId - User ID to check
 * @returns True if email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();

  const { data: user, error } = await admin.auth.admin.getUserById(userId);

  if (error || !user) {
    return false;
  }

  return !!user.user.email_confirmed_at;
}

/**
 * Send email verification
 *
 * @param email - Email address to send verification to
 */
export async function sendEmailVerification(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    console.error('Error sending email verification:', error);
    throw error;
  }
}
