import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getServerSupabase } from '@/lib/auth/session';
import { changeEmailSchema } from '@/lib/validations/profile';
import { createAuditLog } from '@/lib/security/auditLog';
import prisma from '@/lib/db/prisma';
import { ZodError } from 'zod';

/**
 * POST /api/user/change-email
 * Initiate email change (sends verification email)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Validate input
    const validatedData = changeEmailSchema.parse(body);

    // Check if new email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.newEmail },
    });

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await getServerSupabase();

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validatedData.password,
    });

    if (signInError) {
      await createAuditLog({
        action: 'EMAIL_CHANGE_FAILED',
        userId: user.id,
        resource: 'User',
        resourceId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          reason: 'Invalid password',
        },
      });

      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 400 }
      );
    }

    // Update email via Supabase Auth (sends verification email)
    const { error: updateError } = await supabase.auth.updateUser({
      email: validatedData.newEmail,
    });

    if (updateError) {
      console.error('Error updating email:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email' },
        { status: 500 }
      );
    }

    // Log email change initiation
    await createAuditLog({
      action: 'EMAIL_CHANGE_INITIATED',
      userId: user.id,
      resource: 'User',
      resourceId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        oldEmail: user.email,
        newEmail: validatedData.newEmail,
      },
    });

    // Update database (email will be verified after user clicks link)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: validatedData.newEmail,
        emailVerified: false, // Require re-verification
      },
    });

    return NextResponse.json({
      message: 'Verification email sent. Please check your inbox to confirm the new email address.',
    });
  } catch (error) {
    console.error('Error changing email:', error);

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
      { error: 'Failed to change email' },
      { status: 500 }
    );
  }
}
