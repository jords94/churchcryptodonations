/**
 * Signup API Route
 *
 * Handles new user registration including:
 * - Input validation
 * - Rate limiting
 * - Supabase auth user creation
 * - Database user record creation
 * - Audit logging
 *
 * Security measures:
 * - Rate limiting to prevent spam signups
 * - Strong password requirements
 * - Email verification required
 * - Audit trail of all signup attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth/supabase';
import { createDatabaseUser, getIPAddress, getUserAgent } from '@/lib/auth/session';
import { validateEmail, validatePassword } from '@/lib/security/validation';
import { rateLimitByIP } from '@/lib/security/rateLimiter';
import { logAuthEvent } from '@/lib/security/auditLog';
import { RATE_LIMITS } from '@/config/constants';
import { z } from 'zod';

/**
 * Signup request schema
 * Validates all required fields for registration
 */
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  churchName: z
    .string()
    .min(3, 'Church name must be at least 3 characters')
    .max(200, 'Church name too long')
    .optional(), // Optional during signup, can be added later
});

/**
 * POST /api/auth/signup
 *
 * Creates a new user account
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   name: string,
 *   churchName?: string
 * }
 *
 * Response:
 * - 201: User created successfully
 * - 400: Invalid input
 * - 429: Rate limit exceeded
 * - 409: Email already registered
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const ipAddress = getIPAddress(request);
  const userAgent = getUserAgent(request);

  try {
    // Apply rate limiting (3 signups per hour from same IP)
    await rateLimitByIP(ipAddress, 'signup', RATE_LIMITS.AUTH_SIGNUP);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Additional password validation with detailed requirements
    try {
      validatePassword(validatedData.password);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Weak password',
          message: error instanceof Error ? error.message : 'Password does not meet requirements',
        },
        { status: 400 }
      );
    }

    // Normalize email
    const email = validateEmail(validatedData.email);

    // Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
        },
        // Email confirmation required (set in Supabase dashboard)
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      // Log failed signup attempt
      await logAuthEvent(
        'SIGNUP_FAILED',
        null,
        email,
        ipAddress,
        userAgent,
        false,
        error.message
      );

      // Handle specific error cases
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          {
            error: 'Email already registered',
            message: 'An account with this email already exists.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: 'Signup failed',
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      throw new Error('User creation failed - no user returned');
    }

    // Create user record in our database
    try {
      await createDatabaseUser(email, validatedData.name, data.user.id);
    } catch (dbError) {
      console.error('Failed to create database user:', dbError);

      // Attempt to delete Supabase user to keep systems in sync
      // This is a best-effort cleanup
      try {
        await supabase.auth.admin.deleteUser(data.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup Supabase user:', cleanupError);
      }

      return NextResponse.json(
        {
          error: 'Registration failed',
          message: 'Failed to complete registration. Please try again.',
        },
        { status: 500 }
      );
    }

    // Log successful signup
    await logAuthEvent('SIGNUP_SUCCESS', data.user.id, email, ipAddress, userAgent, true);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message:
          'Registration successful! Please check your email to verify your account.',
        user: {
          id: data.user.id,
          email: data.user.email,
          emailVerified: data.user.email_confirmed_at !== null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);

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
