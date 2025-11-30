/**
 * QR Code Creation API Route
 *
 * Creates a new QR code for a church wallet.
 *
 * Security features:
 * - Authentication required
 * - RBAC permission check (QR_CREATE)
 * - Rate limiting (10 QR codes per hour per user)
 * - Input validation
 * - Audit logging
 *
 * Flow:
 * 1. Validate user authentication
 * 2. Check QR_CREATE permission
 * 3. Validate wallet exists and belongs to church
 * 4. Create QR code record
 * 5. Return QR code data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { requireAuth, getIPAddress } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import { rateLimitByUser } from '@/lib/security/rateLimiter';
import { RATE_LIMITS } from '@/config/constants';
import { createAuditLog } from '@/lib/security/auditLog';

/**
 * QR code creation request schema
 */
const createQRCodeSchema = z.object({
  walletId: z.string().cuid('Invalid wallet ID'),
  churchId: z.string().cuid('Invalid church ID'),
  campaignName: z.string().min(1, 'Campaign name required').max(50, 'Campaign name too long'),
  suggestedAmount: z.string().optional(),
  customMessage: z.string().max(200, 'Message too long').optional(),
  foregroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#FFFFFF'),
  includeLogo: z.boolean().default(true),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
});

/**
 * POST /api/qrcodes/create
 *
 * Creates a new QR code
 *
 * Request body:
 * {
 *   walletId: string,
 *   churchId: string,
 *   campaignName: string,
 *   suggestedAmount?: string,
 *   customMessage?: string,
 *   foregroundColor?: string,
 *   backgroundColor?: string,
 *   includeLogo?: boolean,
 *   errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
 * }
 *
 * Response:
 * {
 *   qrCode: {
 *     id: string,
 *     campaignName: string,
 *     url: string, // Public donation URL
 *     ...
 *   }
 * }
 *
 * Response codes:
 * - 201: QR code created successfully
 * - 400: Invalid input or wallet not found
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();

    // 2. Parse and validate request
    const body = await request.json();
    const validatedData = createQRCodeSchema.parse(body);

    const {
      walletId,
      churchId,
      campaignName,
      suggestedAmount,
      customMessage,
      foregroundColor,
      backgroundColor,
      includeLogo,
      errorCorrectionLevel,
    } = validatedData;

    // 3. Check RBAC permission
    const ipAddress = getIPAddress(request);
    await requirePermission(user.id, churchId, Permission.QR_CREATE, ipAddress);

    // 4. Apply rate limiting (10 QR code creations per hour per user)
    await rateLimitByUser(user.id, 'qrcode:create', RATE_LIMITS.API_QR_CREATE || 10);

    // 5. Verify wallet exists and belongs to church
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        churchId: true,
        address: true,
        chain: true,
        isActive: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found', message: 'The specified wallet does not exist.' },
        { status: 404 }
      );
    }

    if (wallet.churchId !== churchId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'This wallet does not belong to the specified church.',
        },
        { status: 403 }
      );
    }

    if (!wallet.isActive) {
      return NextResponse.json(
        {
          error: 'Inactive wallet',
          message: 'Cannot create QR code for inactive wallet.',
        },
        { status: 400 }
      );
    }

    // 6. Validate suggested amount (if provided)
    if (suggestedAmount) {
      const amountNum = parseFloat(suggestedAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          {
            error: 'Invalid amount',
            message: 'Suggested amount must be a positive number.',
          },
          { status: 400 }
        );
      }
    }

    // 7. Create QR code
    const qrCode = await prisma.qRCode.create({
      data: {
        walletId,
        campaignName,
        suggestedAmount: suggestedAmount || null,
        customMessage: customMessage || null,
        foregroundColor,
        backgroundColor,
        includeLogo,
        errorCorrectionLevel,
        isActive: true,
        views: 0,
        donations: 0,
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
        wallet: {
          select: {
            address: true,
            chain: true,
          },
        },
      },
    });

    // 8. Generate public donation URL
    const donationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donate/${qrCode.id}`;

    // 9. Log QR code creation for audit trail
    await createAuditLog({
      action: 'QR_CODE_CREATED',
      userId: user.id,
      churchId,
      resource: 'QRCode',
      resourceId: qrCode.id,
      ipAddress,
      metadata: {
        walletId,
        campaignName,
        chain: qrCode.wallet.chain,
      },
    });

    // 10. Return QR code data
    return NextResponse.json(
      {
        success: true,
        qrCode: {
          id: qrCode.id,
          campaignName: qrCode.campaignName,
          suggestedAmount: qrCode.suggestedAmount,
          customMessage: qrCode.customMessage,
          foregroundColor: qrCode.foregroundColor,
          backgroundColor: qrCode.backgroundColor,
          includeLogo: qrCode.includeLogo,
          errorCorrectionLevel: qrCode.errorCorrectionLevel,
          isActive: qrCode.isActive,
          views: qrCode.views,
          donations: qrCode.donations,
          createdAt: qrCode.createdAt,
          url: donationUrl,
          wallet: {
            address: qrCode.wallet.address,
            chain: qrCode.wallet.chain,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('QR code creation error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: error.errors[0].message,
          fields: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('Too many requests')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: error.message,
        },
        { status: 429 }
      );
    }

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to create QR codes for this church.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while creating the QR code. Please try again.',
      },
      { status: 500 }
    );
  }
}
