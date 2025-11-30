/**
 * QR Codes List API Route
 *
 * Fetches all QR codes for a church.
 *
 * Security features:
 * - Authentication required
 * - RBAC permission check (QR_VIEW)
 * - Pagination support
 * - Filtering by wallet, campaign, active status
 *
 * Query parameters:
 * - churchId: required
 * - walletId: optional (filter by wallet)
 * - isActive: optional (filter by active status)
 * - page: optional (default: 1)
 * - limit: optional (default: 20, max: 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';

/**
 * GET /api/qrcodes
 *
 * Fetches QR codes for a church
 *
 * Query params:
 * - churchId: string (required)
 * - walletId: string (optional)
 * - isActive: boolean (optional)
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 *
 * Response:
 * {
 *   qrCodes: [...],
 *   pagination: {
 *     total: number,
 *     page: number,
 *     limit: number,
 *     totalPages: number
 *   }
 * }
 *
 * Response codes:
 * - 200: Success
 * - 400: Missing or invalid parameters
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const churchId = searchParams.get('churchId');
    const walletId = searchParams.get('walletId');
    const isActiveParam = searchParams.get('isActive');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Validate churchId
    if (!churchId) {
      return NextResponse.json(
        { error: 'Missing parameter', message: 'churchId is required' },
        { status: 400 }
      );
    }

    // 3. Check RBAC permission
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    await requirePermission(user.id, churchId, Permission.QR_VIEW, ipAddress);

    // 4. Parse pagination parameters
    const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam))) : 20;
    const skip = (page - 1) * limit;

    // 5. Build query filters
    const where: any = {};

    // Filter by church (via wallet)
    where.wallet = {
      churchId,
    };

    // Filter by specific wallet (optional)
    if (walletId) {
      where.walletId = walletId;
    }

    // Filter by active status (optional)
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true';
    }

    // 6. Fetch QR codes with pagination
    const [qrCodes, total] = await Promise.all([
      prisma.qRCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          campaignName: true,
          suggestedAmount: true,
          customMessage: true,
          foregroundColor: true,
          backgroundColor: true,
          includeLogo: true,
          errorCorrectionLevel: true,
          isActive: true,
          views: true,
          donations: true,
          createdAt: true,
          updatedAt: true,
          wallet: {
            select: {
              id: true,
              address: true,
              chain: true,
              label: true,
            },
          },
        },
      }),
      prisma.qRCode.count({ where }),
    ]);

    // 7. Generate donation URLs for each QR code
    const qrCodesWithUrls = qrCodes.map((qrCode) => ({
      ...qrCode,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donate/${qrCode.id}`,
    }));

    // 8. Return QR codes with pagination info
    return NextResponse.json(
      {
        success: true,
        qrCodes: qrCodesWithUrls,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('QR codes fetch error:', error);

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to view QR codes for this church.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching QR codes. Please try again.',
      },
      { status: 500 }
    );
  }
}
