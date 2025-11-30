/**
 * Individual QR Code API Routes
 *
 * Handles operations on individual QR codes.
 *
 * Routes:
 * - GET /api/qrcodes/[id] - Get single QR code
 * - PATCH /api/qrcodes/[id] - Update QR code
 * - DELETE /api/qrcodes/[id] - Deactivate QR code
 *
 * Security features:
 * - Authentication required
 * - RBAC permission checks
 * - Input validation
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { requireAuth, getIPAddress } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';
import { createAuditLog } from '@/lib/security/auditLog';

/**
 * QR code update request schema
 */
const updateQRCodeSchema = z.object({
  campaignName: z.string().min(1).max(50).optional(),
  suggestedAmount: z.string().optional(),
  customMessage: z.string().max(200).optional(),
  foregroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  includeLogo: z.boolean().optional(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/qrcodes/[id]
 *
 * Fetches a single QR code by ID
 *
 * Response codes:
 * - 200: Success
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: QR code not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();

    // 2. Fetch QR code
    const qrCode = await prisma.qRCode.findUnique({
      where: { id: params.id },
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
            churchId: true,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { error: 'Not found', message: 'QR code not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission
    const ipAddress = getIPAddress(request);
    await requirePermission(user.id, qrCode.wallet.churchId, Permission.QR_VIEW, ipAddress);

    // 4. Generate donation URL
    const donationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donate/${qrCode.id}`;

    // 5. Return QR code data
    return NextResponse.json(
      {
        success: true,
        qrCode: {
          ...qrCode,
          url: donationUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('QR code fetch error:', error);

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to view this QR code.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/qrcodes/[id]
 *
 * Updates a QR code
 *
 * Request body: Partial QR code data (any field from updateQRCodeSchema)
 *
 * Response codes:
 * - 200: Updated successfully
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: QR code not found
 * - 500: Server error
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();

    // 2. Fetch existing QR code
    const existingQRCode = await prisma.qRCode.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        wallet: {
          select: {
            churchId: true,
          },
        },
      },
    });

    if (!existingQRCode) {
      return NextResponse.json(
        { error: 'Not found', message: 'QR code not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission
    const ipAddress = getIPAddress(request);
    await requirePermission(
      user.id,
      existingQRCode.wallet.churchId,
      Permission.QR_UPDATE,
      ipAddress
    );

    // 4. Parse and validate request
    const body = await request.json();
    const validatedData = updateQRCodeSchema.parse(body);

    // 5. Validate suggested amount (if provided)
    if (validatedData.suggestedAmount) {
      const amountNum = parseFloat(validatedData.suggestedAmount);
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

    // 6. Update QR code
    const updatedQRCode = await prisma.qRCode.update({
      where: { id: params.id },
      data: {
        ...(validatedData.campaignName && { campaignName: validatedData.campaignName }),
        ...(validatedData.suggestedAmount !== undefined && {
          suggestedAmount: validatedData.suggestedAmount || null,
        }),
        ...(validatedData.customMessage !== undefined && {
          customMessage: validatedData.customMessage || null,
        }),
        ...(validatedData.foregroundColor && { foregroundColor: validatedData.foregroundColor }),
        ...(validatedData.backgroundColor && { backgroundColor: validatedData.backgroundColor }),
        ...(validatedData.includeLogo !== undefined && { includeLogo: validatedData.includeLogo }),
        ...(validatedData.errorCorrectionLevel && {
          errorCorrectionLevel: validatedData.errorCorrectionLevel,
        }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
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
    });

    // 7. Log update for audit trail
    await createAuditLog({
      action: 'QR_CODE_UPDATED',
      userId: user.id,
      churchId: existingQRCode.wallet.churchId,
      resource: 'QRCode',
      resourceId: params.id,
      ipAddress,
      metadata: {
        updates: validatedData,
      },
    });

    // 8. Generate donation URL
    const donationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donate/${updatedQRCode.id}`;

    // 9. Return updated QR code
    return NextResponse.json(
      {
        success: true,
        qrCode: {
          ...updatedQRCode,
          url: donationUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('QR code update error:', error);

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

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to update this QR code.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while updating the QR code. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/qrcodes/[id]
 *
 * Deactivates a QR code (soft delete)
 *
 * We don't actually delete QR codes to preserve donation history and analytics.
 * Instead, we set isActive = false.
 *
 * Response codes:
 * - 200: Deactivated successfully
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: QR code not found
 * - 500: Server error
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();

    // 2. Fetch existing QR code
    const existingQRCode = await prisma.qRCode.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        isActive: true,
        wallet: {
          select: {
            churchId: true,
          },
        },
      },
    });

    if (!existingQRCode) {
      return NextResponse.json(
        { error: 'Not found', message: 'QR code not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission
    const ipAddress = getIPAddress(request);
    await requirePermission(
      user.id,
      existingQRCode.wallet.churchId,
      Permission.QR_DELETE,
      ipAddress
    );

    // 4. Deactivate QR code (soft delete)
    await prisma.qRCode.update({
      where: { id: params.id },
      data: {
        isActive: false,
      },
    });

    // 5. Log deletion for audit trail
    await createAuditLog({
      action: 'QR_CODE_DELETED',
      userId: user.id,
      churchId: existingQRCode.wallet.churchId,
      resource: 'QRCode',
      resourceId: params.id,
      ipAddress,
      metadata: {
        wasActive: existingQRCode.isActive,
      },
    });

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'QR code deactivated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('QR code delete error:', error);

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: 'You do not have permission to delete this QR code.',
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while deleting the QR code. Please try again.',
      },
      { status: 500 }
    );
  }
}
