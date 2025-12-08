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
import { getSupabaseAdmin } from '@/lib/auth/supabase';
import { getIPAddress, getUserAgent } from '@/lib/auth/session';
import { validateEmail, validatePassword } from '@/lib/security/validation';
import { rateLimitByIP } from '@/lib/security/rateLimiter';
import { logAuthEvent } from '@/lib/security/auditLog';
import { RATE_LIMITS } from '@/config/constants';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

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
    .max(200, 'Church name too long'), // Required for MVP signup
});

/**
 * POST /api/auth/signup
 *
 * Creates a new user account with church (all-in-one signup for MVP)
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   name: string,
 *   churchName: string (required)
 * }
 *
 * Creates:
 * - Supabase auth user
 * - Database User record
 * - Church record (with auto-generated slug)
 * - ChurchUser link (user as ADMIN)
 *
 * Response:
 * - 201: User and church created successfully
 * - 400: Invalid input
 * - 429: Rate limit exceeded
 * - 409: Email already registered
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const ipAddress = getIPAddress(request);
  const userAgent = getUserAgent(request);

  console.log('🌐 Signup API called from IP:', ipAddress);

  try {
    // Rate limiting enabled for production
    await rateLimitByIP(ipAddress, 'signup', RATE_LIMITS.AUTH_SIGNUP);

    // Parse and validate request body
    const body = await request.json();
    console.log('🔍 Signup request received for:', body.email);
    console.log('📦 Request body:', { name: body.name, churchName: body.churchName, email: body.email });

    const validatedData = signupSchema.parse(body);
    console.log('✅ Validation passed for:', validatedData.email);

    // Additional password validation with detailed requirements
    try {
      validatePassword(validatedData.password);
    } catch (error) {
      console.error('❌ Password validation failed:', error);
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
    console.log('📧 Normalized email:', email);

    // Check if we should skip email verification (development mode)
    const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    console.log('📧 Skip email verification:', skipEmailVerification);

    // Create Supabase auth user using admin client
    // This allows us to bypass email verification in development
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: validatedData.password,
      email_confirm: skipEmailVerification, // Auto-confirm email in development
      user_metadata: {
        name: validatedData.name,
      },
    });

    if (error) {
      console.error('❌ Supabase signup error:', error);

      // Log failed signup attempt (non-blocking)
      try {
        await logAuthEvent(
          'SIGNUP_FAILED',
          null,
          email,
          ipAddress,
          userAgent,
          false,
          error.message
        );
      } catch (auditError) {
        console.error('⚠️  Audit logging failed:', auditError);
      }

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

    console.log('✅ Supabase user created:', data.user.id);

    // Create user, church, and church-user link in a transaction
    try {
      console.log('🏗️  Creating database records in transaction...');

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create user record
        const user = await tx.user.create({
          data: {
            id: data.user!.id,
            email,
            name: validatedData.name,
            passwordHash: '', // Managed by Supabase
            emailVerified: skipEmailVerification, // Auto-verify in development
          },
        });
        console.log('✅ User record created:', user.id);

        // 2. Create church record
        // Generate URL-friendly slug from church name
        const baseSlug = validatedData.churchName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Ensure slug is unique by appending random suffix if needed
        let slug = baseSlug;
        let slugExists = await tx.church.findUnique({ where: { slug } });
        let attempts = 0;

        while (slugExists && attempts < 10) {
          const randomSuffix = Math.random().toString(36).substring(2, 6);
          slug = `${baseSlug}-${randomSuffix}`;
          slugExists = await tx.church.findUnique({ where: { slug } });
          attempts++;
        }

        if (slugExists) {
          throw new Error('Failed to generate unique church slug');
        }

        const church = await tx.church.create({
          data: {
            name: validatedData.churchName,
            slug,
            email, // Use user's email as church contact email
            subscriptionTier: 'BASIC',
            subscriptionStatus: 'TRIAL',
            enabledChains: ['BTC', 'USDC'], // MVP: Enable both chains by default
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          },
        });
        console.log('✅ Church record created:', church.id, 'slug:', church.slug);

        // 3. Link user to church as ADMIN
        const churchUser = await tx.churchUser.create({
          data: {
            churchId: church.id,
            userId: user.id,
            role: 'ADMIN',
            isActive: true,
            acceptedAt: new Date(), // Auto-accepted (user is creator)
          },
        });
        console.log('✅ ChurchUser link created:', churchUser.id, 'role: ADMIN');

        return { user, church, churchUser };
      });

      console.log('🎉 All database records created successfully');
    } catch (dbError) {
      console.error('❌ Failed to create database records:', dbError);

      // Attempt to delete Supabase user to keep systems in sync
      // This is a best-effort cleanup
      try {
        console.log('🧹 Attempting to cleanup Supabase user...');
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        console.log('✅ Supabase user cleanup successful');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup Supabase user:', cleanupError);
      }

      return NextResponse.json(
        {
          error: 'Registration failed',
          message: 'Failed to complete registration. Please try again.',
        },
        { status: 500 }
      );
    }

    // Log successful signup (non-blocking)
    try {
      await logAuthEvent('SIGNUP_SUCCESS', data.user.id, email, ipAddress, userAgent, true);
      console.log('📝 Audit log entry created');
    } catch (auditError) {
      console.error('⚠️  Audit logging failed (non-blocking):', auditError);
      // Don't fail the signup if audit logging fails
    }

    console.log('🎉 SIGNUP COMPLETE - User and church created successfully');

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message:
          'Registration successful! Your church has been created. Please check your email to verify your account.',
        user: {
          id: data.user.id,
          email: data.user.email,
          emailVerified: data.user.email_confirmed_at !== null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Signup error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
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
      console.error('❌ Rate limit error:', error.message);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: error.message,
        },
        { status: 429 }
      );
    }

    // Generic error
    console.error('❌ Unexpected error during signup:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
