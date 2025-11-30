/**
 * Logout API Route
 *
 * Handles user logout including:
 * - Session termination
 * - Token invalidation
 * - Audit logging
 *
 * Security measures:
 * - Invalidates both access and refresh tokens
 * - Logs logout for audit trail
 * - Clears all session data
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth/supabase';
import { getUserContext, getIPAddress, getUserAgent } from '@/lib/auth/session';
import { logAuthEvent } from '@/lib/security/auditLog';

/**
 * POST /api/auth/logout
 *
 * Logs out the current user and invalidates their session
 *
 * Response:
 * - 200: Logout successful
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const ipAddress = getIPAddress(request);
  const userAgent = getUserAgent(request);

  try {
    // Get current user context
    const user = await getUserContext();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Supabase logout error:', error);

      return NextResponse.json(
        {
          error: 'Logout failed',
          message: error.message,
        },
        { status: 500 }
      );
    }

    // Log logout event (only if user was authenticated)
    if (user) {
      await logAuthEvent('LOGOUT', user.id, user.email, ipAddress, userAgent, true);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during logout.',
      },
      { status: 500 }
    );
  }
}
