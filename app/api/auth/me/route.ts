/**
 * Current User API Route
 *
 * Returns the currently authenticated user's data.
 *
 * GET /api/auth/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 /api/auth/me called');

    // Pass the request to getUserContext so it can check the Authorization header
    const user = await getUserContext(request);

    if (!user) {
      console.log('❌ No user context found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}
