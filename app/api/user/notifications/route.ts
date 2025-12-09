import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { notificationPreferencesSchema } from '@/lib/validations/profile';
import { ZodError } from 'zod';

/**
 * GET /api/user/notifications
 * Get current user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Fetch user's notification preferences
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        notificationPreferences: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse stored preferences or return defaults
    const preferences = userProfile.notificationPreferences || {
      donationReceived: true,
      dailySummary: false,
      weeklySummary: true,
      monthlyReport: true,
      lowBalanceAlerts: true,
      securityAlerts: true,
      productUpdates: true,
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/notifications
 * Update current user's notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Validate input
    const validatedData = notificationPreferencesSchema.parse(body);

    // Security alerts cannot be disabled
    if (!validatedData.securityAlerts) {
      validatedData.securityAlerts = true;
    }

    // Update notification preferences
    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationPreferences: validatedData,
      },
    });

    return NextResponse.json({
      message: 'Notification preferences updated successfully',
      preferences: validatedData,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);

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
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
