/**
 * Login API Route
 *
 * Handles user authentication including:
 * - Input validation
 * - Rate limiting (prevents brute force attacks)
 * - Supabase authentication
 * - Audit logging
 * - Session creation
 *
 * Security measures:
 * - Rate limiting (5 attempts per 15 minutes)
 * - Account lockout after repeated failures
 * - Audit logging of all attempts
 * - No information leakage (same error for invalid email/password)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth/supabase';
import {
  getIPAddress,
  getUserAgent,
  logSuccessfulLogin,
  logFailedLogin,
} from '@/lib/auth/session';
import { validateEmail } from '@/lib/security/validation';
import { rateLimitByIP } from '@/lib/security/rateLimiter';
import { RATE_LIMITS } from '@/config/constants';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

/**
 * Login request schema
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * POST /api/auth/login
 *
 * Authenticates a user and creates a session
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   rememberMe?: boolean
 * }
 *
 * Response:
 * - 200: Login successful
 * - 400: Invalid input
 * - 401: Invalid credentials
 * - 403: Email not verified or account locked
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const ipAddress = getIPAddress(request);
  const userAgent = getUserAgent(request);

  try {
    // Apply rate limiting (5 attempts per 15 minutes from same IP)
    // This prevents brute force attacks
    await rateLimitByIP(ipAddress, 'login', RATE_LIMITS.AUTH_LOGIN);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Normalize email
    const email = validateEmail(validatedData.email);

    // Attempt authentication with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: validatedData.password,
    });

    if (error || !data.user) {
      // Log failed login attempt
      await logFailedLogin(
        email,
        error?.message || 'Invalid credentials',
        ipAddress,
        userAgent
      );

      // Return generic error message (don't leak information about which field was wrong)
      // This prevents user enumeration attacks
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        mfaEnabled: true,
      },
    });

    if (!dbUser) {
      // User exists in Supabase but not in database
      // This shouldn't happen, but handle gracefully
      await logFailedLogin(email, 'User not found in database', ipAddress, userAgent);

      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Account setup incomplete. Please contact support.',
        },
        { status: 401 }
      );
    }

    // Check email verification (unless skipped in development)
    if (!dbUser.emailVerified && process.env.SKIP_EMAIL_VERIFICATION !== 'true') {
      await logFailedLogin(email, 'Email not verified', ipAddress, userAgent);

      return NextResponse.json(
        {
          error: 'Email not verified',
          message: 'Please verify your email address before logging in.',
          needsVerification: true,
        },
        { status: 403 }
      );
    }

    // Log successful login and update last login time
    await logSuccessfulLogin(dbUser.id, email, ipAddress, userAgent);

    // Get user's churches
    const churches = await prisma.churchUser.findMany({
      where: {
        userId: dbUser.id,
        isActive: true,
      },
      include: {
        church: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return success response with user data and session
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          emailVerified: dbUser.emailVerified,
          mfaEnabled: dbUser.mfaEnabled,
        },
        churches: churches.map((cu) => ({
          id: cu.church.id,
          name: cu.church.name,
          slug: cu.church.slug,
          logo: cu.church.logo,
          role: cu.role,
        })),
        session: {
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresAt: data.session?.expires_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: error.errors[0].message,
        },
        { status: 400 }
      );
    }

    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('Too many requests')) {
      return NextResponse.json(
        {
          error: 'Too many login attempts',
          message: error.message,
        },
        { status: 429 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
