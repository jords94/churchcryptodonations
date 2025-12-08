/**
 * My Churches API Route
 *
 * Returns all churches the current user belongs to.
 *
 * GET /api/churches/my-churches?userId={userId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 /api/churches/my-churches called');

    // Authenticate user (pass request to check Authorization header)
    const user = await requireAuth(request);

    // Get userId from query params (optional, defaults to authenticated user)
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || user.id;

    // Security check: Users can only fetch their own churches
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You can only fetch your own churches' },
        { status: 403 }
      );
    }

    // Fetch user's church memberships
    const churchMemberships = await prisma.churchUser.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        church: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            email: true,
            subscriptionTier: true,
            subscriptionStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // First church joined is first
      },
    });

    // Transform to church membership format
    const churches = churchMemberships.map((membership) => ({
      id: membership.church.id,
      name: membership.church.name,
      slug: membership.church.slug,
      role: membership.role,
      logoUrl: membership.church.logo,
      websiteUrl: null, // MVP: Not implemented yet
      contactEmail: membership.church.email,
      subscriptionTier: membership.church.subscriptionTier,
      subscriptionStatus: membership.church.subscriptionStatus,
    }));

    console.log('✅ Found', churches.length, 'church(es) for user:', user.email);

    return NextResponse.json({
      churches,
      total: churches.length,
    });
  } catch (error) {
    console.error('Fetch churches error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch churches' },
      { status: 500 }
    );
  }
}
