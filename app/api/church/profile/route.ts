import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getUserRoleInChurch } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import prisma from '@/lib/db/prisma';
import { churchProfileSchema } from '@/lib/validations/profile';
import { ZodError } from 'zod';
import { userHasPermission } from '@/lib/auth/rbac';

/**
 * GET /api/church/profile
 * Get church profile information
 *
 * Query params:
 * - churchId: Church ID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const churchId = searchParams.get('churchId');

    if (!churchId) {
      return NextResponse.json(
        { error: 'Church ID is required' },
        { status: 400 }
      );
    }

    // Check if user has permission to view church settings
    const hasPermission = await userHasPermission(
      user.id,
      churchId,
      Permission.CHURCH_VIEW_SETTINGS
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to view church settings' },
        { status: 403 }
      );
    }

    // Fetch church profile
    const church = await prisma.church.findUnique({
      where: { id: churchId },
      select: {
        id: true,
        name: true,
        officialName: true,
        slug: true,
        email: true,
        contactEmail: true,
        phone: true,
        contactPhone: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        logo: true,
        brandColor: true,
        taxId: true,
        taxIdType: true,
        isDgrRegistered: true,
        denomination: true,
        congregationSize: true,
        defaultCurrency: true,
        timezone: true,
        donationMessage: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!church) {
      return NextResponse.json(
        { error: 'Church not found' },
        { status: 404 }
      );
    }

    // Create a website URL if one doesn't exist (construct from email domain)
    const website = church.contactEmail
      ? `https://${church.contactEmail.split('@')[1]}`
      : '';

    return NextResponse.json({
      ...church,
      website, // Add website field for the form
    });
  } catch (error) {
    console.error('Error fetching church profile:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch church profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/church/profile
 * Update church profile information (Admin only)
 *
 * Query params:
 * - churchId: Church ID (required)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const churchId = searchParams.get('churchId');

    if (!churchId) {
      return NextResponse.json(
        { error: 'Church ID is required' },
        { status: 400 }
      );
    }

    // Check if user has permission to edit church settings (ADMIN only)
    const hasPermission = await userHasPermission(
      user.id,
      churchId,
      Permission.CHURCH_EDIT_SETTINGS
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Only administrators can edit church settings' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = churchProfileSchema.parse(body);

    // Update church profile
    const updatedChurch = await prisma.church.update({
      where: { id: churchId },
      data: {
        name: validatedData.name,
        officialName: validatedData.officialName || null,
        contactEmail: validatedData.contactEmail,
        contactPhone: validatedData.contactPhone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        postalCode: validatedData.postalCode || null,
        country: validatedData.country,
        taxId: validatedData.taxId || null,
        taxIdType: validatedData.taxIdType || null,
        isDgrRegistered: validatedData.isDgrRegistered,
        denomination: validatedData.denomination || null,
        congregationSize: validatedData.congregationSize || null,
        brandColor: validatedData.brandColor,
        donationMessage: validatedData.donationMessage || null,
        defaultCurrency: validatedData.defaultCurrency,
        timezone: validatedData.timezone,
      },
      select: {
        id: true,
        name: true,
        officialName: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        logo: true,
        brandColor: true,
        taxId: true,
        taxIdType: true,
        isDgrRegistered: true,
        denomination: true,
        congregationSize: true,
        defaultCurrency: true,
        timezone: true,
        donationMessage: true,
      },
    });

    return NextResponse.json(updatedChurch);
  } catch (error) {
    console.error('Error updating church profile:', error);

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
      { error: 'Failed to update church profile' },
      { status: 500 }
    );
  }
}
