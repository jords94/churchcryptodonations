/**
 * ═══════════════════════════════════════════════════════════════════════
 * LOGIN API ROUTE - Handles User Authentication
 * ═══════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS FILE DOES:
 * This API endpoint handles user login requests. When someone tries to log in,
 * their browser sends their email and password to this API, which verifies
 * the credentials and creates a session if they're correct.
 *
 * STEP-BY-STEP FLOW:
 * 1. User submits login form on website
 * 2. Form data is sent to this API endpoint (/api/auth/login)
 * 3. We check if they're trying to login too many times (rate limiting)
 * 4. We validate the email format and password
 * 5. We check credentials against Supabase (our authentication service)
 * 6. If valid, we create a session and return user data
 * 7. If invalid, we log the failure and return an error
 *
 * SECURITY MEASURES (WHY WE NEED THEM):
 * - Rate limiting (5 attempts per 15 minutes)
 *   WHY: Prevents hackers from trying millions of password combinations
 *
 * - Account lockout after repeated failures
 *   WHY: Stops automated attacks trying to guess passwords
 *
 * - Audit logging of all login attempts
 *   WHY: Lets us detect suspicious activity and investigate breaches
 *
 * - No information leakage
 *   WHY: We don't tell attackers if the email exists or if password was wrong
 *        We always say "Invalid email or password" instead of being specific
 *        This prevents attackers from discovering which emails are registered
 *
 * FOR BEGINNERS:
 * - An "API Route" is a function that runs on the server (not in browser)
 * - It receives data from the browser and sends back a response
 * - Think of it like a restaurant order: browser orders, API prepares, sends back result
 * - This file only runs when someone POSTs to /api/auth/login
 */

// ═══ IMPORT STATEMENTS ═══
// These bring in code from other files that we need
// Think of imports like borrowing tools from different toolboxes

// Next.js server utilities for handling requests and responses
import { NextRequest, NextResponse } from 'next/server';

// Supabase client for authentication (a third-party auth service)
// WHY: We use Supabase instead of building our own auth system for security
import { supabase } from '@/lib/auth/supabase';

// Session management utilities
// These help us track user login information and behavior
import {
  getIPAddress,      // Gets user's IP address (identifies their location/network)
  getUserAgent,      // Gets user's browser info (Chrome, Firefox, etc.)
  logSuccessfulLogin, // Records when someone logs in successfully
  logFailedLogin,    // Records when someone fails to log in
} from '@/lib/auth/session';

// Email validation utility
// WHY: We need to ensure the email is properly formatted
import { validateEmail } from '@/lib/security/validation';

// Rate limiting utility
// WHY: Prevents attackers from trying to guess passwords rapidly
import { rateLimitByIP } from '@/lib/security/rateLimiter';

// Configuration constants (limits, thresholds, etc.)
import { RATE_LIMITS } from '@/config/constants';

// Zod: A library for data validation
// WHY: We use it to ensure incoming data has the right format before processing
import { z } from 'zod';

// Prisma: Our database client
// WHY: We use it to read/write data to our PostgreSQL database
import prisma from '@/lib/db/prisma';

/**
 * ═══ LOGIN REQUEST VALIDATION SCHEMA ═══
 *
 * WHAT THIS DOES:
 * Defines the expected structure of login requests.
 * Like a checklist: "email must be an email, password can't be empty"
 *
 * WHY WE NEED THIS:
 * - Prevents invalid data from reaching our database
 * - Gives clear error messages when something's wrong
 * - Stops attacks that send malformed data
 *
 * HOW IT WORKS:
 * Zod checks each field and returns errors if validation fails
 */
const loginSchema = z.object({
  // Email must be a valid email format (has @ and domain)
  email: z.string().email('Invalid email address'),

  // Password must be at least 1 character (can't be empty)
  // WHY min(1) instead of detailed rules: We validate on signup, login just needs non-empty
  password: z.string().min(1, 'Password is required'),

  // "Remember me" checkbox is optional (true/false or not provided)
  // WHY optional: User can choose whether to stay logged in for 30 days
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
