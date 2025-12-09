import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServerSupabase } from '@/lib/auth/session';
import { changePasswordSchema } from '@/lib/validations/profile';
import { createAuditLog } from '@/lib/security/auditLog';
import { ZodError } from 'zod';

/**
 * POST /api/user/change-password
 * Change current user's password
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Validate input
    const validatedData = changePasswordSchema.parse(body);

    // Get Supabase client
    const supabase = await getServerSupabase();

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validatedData.currentPassword,
    });

    if (signInError) {
      await createAuditLog({
        action: 'PASSWORD_CHANGE_FAILED',
        userId: user.id,
        resource: 'User',
        resourceId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          reason: 'Invalid current password',
        },
      });

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: validatedData.newPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Log successful password change
    await createAuditLog({
      action: 'PASSWORD_CHANGED',
      userId: user.id,
      resource: 'User',
      resourceId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        success: true,
      },
    });

    return NextResponse.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
