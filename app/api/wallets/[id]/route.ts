/**
 * Wallet Detail API Route
 *
 * GET /api/wallets/:id
 *
 * Fetches detailed information about a specific wallet.
 *
 * Security:
 * - Authentication required
 * - RBAC permission check (WALLET_VIEW)
 * - Users can only view wallets belonging to their churches
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/rbac';
import { Permission } from '@/config/permissions';

/**
 * GET /api/wallets/:id
 *
 * Fetch wallet details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    const walletId = params.id;

    // 2. Fetch wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        churchId: true,
        chain: true,
        address: true,
        derivationPath: true,
        label: true,
        isActive: true,
        balanceCrypto: true,
        balanceUsd: true,
        lastBalanceUpdate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission for this church
    try {
      await requirePermission(
        user.id,
        wallet.churchId,
        Permission.WALLET_VIEW,
        request.headers.get('x-forwarded-for') || 'unknown'
      );
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have permission to view this wallet' },
        { status: 403 }
      );
    }

    // 4. Return wallet data
    return NextResponse.json({
      wallet: {
        id: wallet.id,
        churchId: wallet.churchId,
        chain: wallet.chain,
        address: wallet.address,
        derivationPath: wallet.derivationPath,
        label: wallet.label,
        isActive: wallet.isActive,
        balanceCrypto: wallet.balanceCrypto,
        balanceUsd: wallet.balanceUsd,
        lastBalanceUpdate: wallet.lastBalanceUpdate?.toISOString() || null,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Fetch wallet error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wallets/:id
 *
 * Delete a wallet by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    const walletId = params.id;

    // 2. Fetch wallet from database
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        churchId: true,
        address: true,
        chain: true,
        label: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 3. Check RBAC permission for this church
    try {
      await requirePermission(
        user.id,
        wallet.churchId,
        Permission.WALLET_DELETE,
        request.headers.get('x-forwarded-for') || 'unknown'
      );
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this wallet' },
        { status: 403 }
      );
    }

    // 4. Delete the wallet (cascading deletes will handle related records)
    await prisma.wallet.delete({
      where: { id: walletId },
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: 'Wallet deleted successfully',
    });
  } catch (error) {
    console.error('Delete wallet error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete wallet' },
      { status: 500 }
    );
  }
}
