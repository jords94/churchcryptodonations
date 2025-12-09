import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServerSupabase } from '@/lib/auth/session';
import { createAuditLog } from '@/lib/security/auditLog';

/**
 * GET /api/user/sessions
 * Get current user's active session information
 *
 * Note: Supabase doesn't provide a built-in API to list all active sessions
 * across devices. This endpoint returns the current session information.
 * For full multi-device session management, consider implementing a custom
 * session tracking system in the database.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const supabase = await getServerSupabase();

    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Failed to retrieve session' },
        { status: 500 }
      );
    }

    // Extract session information
    const sessions = [{
      id: session.user.id,
      device: request.headers.get('user-agent') || 'Unknown device',
      ipAddress: request.headers.get('x-forwarded-for') || 'Unknown',
      lastActive: new Date().toISOString(),
      current: true,
      createdAt: session.user.created_at,
    }];

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/sessions
 * Sign out from current session or all sessions
 *
 * Query params:
 * - scope: 'current' (default) or 'all'
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const supabase = await getServerSupabase();

    // Get scope from query params
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'current';

    if (scope === 'all') {
      // Sign out from all sessions globally
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('Error signing out from all sessions:', error);
        return NextResponse.json(
          { error: 'Failed to sign out from all sessions' },
          { status: 500 }
        );
      }

      // Log session revocation
      await createAuditLog({
        action: 'ALL_SESSIONS_REVOKED',
        userId: user.id,
        resource: 'Session',
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          scope: 'global',
        },
      });

      return NextResponse.json({
        message: 'Signed out from all sessions successfully',
      });
    } else {
      // Sign out from current session only
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error signing out:', error);
        return NextResponse.json(
          { error: 'Failed to sign out' },
          { status: 500 }
        );
      }

      // Log session revocation
      await createAuditLog({
        action: 'SESSION_REVOKED',
        userId: user.id,
        resource: 'Session',
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          scope: 'local',
        },
      });

      return NextResponse.json({
        message: 'Signed out successfully',
      });
    }
  } catch (error) {
    console.error('Error revoking session:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
