import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { personalProfileSchema } from '@/lib/validations/profile';
import { ZodError } from 'zod';

/**
 * GET /api/user/profile
 * Get current user's profile information
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Fetch full user details from database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        churches: {
          where: { isActive: true },
          select: {
            role: true,
            church: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Format the response to include role information
    const primaryChurch = userProfile.churches[0];
    const roleDisplay = primaryChurch
      ? `${primaryChurch.role} at ${primaryChurch.church.name}`
      : 'No church affiliation';

    return NextResponse.json({
      ...userProfile,
      roleDisplay,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update current user's profile information
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Validate input
    const validatedData = personalProfileSchema.parse(body);

    // Check if email is being changed
    if (validatedData.email !== user.email) {
      // Email change requires verification - handle this separately via /api/user/change-email
      return NextResponse.json(
        { error: 'To change your email, please use the email change endpoint' },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);

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
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
