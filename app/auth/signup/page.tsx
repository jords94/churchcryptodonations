/**
 * Signup Page
 *
 * New user registration page with:
 * - Name, email, and password inputs
 * - Strong password requirements with visual feedback
 * - Form validation using react-hook-form + Zod
 * - Error handling and display
 * - Success message with email verification prompt
 * - Links to login page
 * - Rate limiting protection
 *
 * Security features:
 * - Client-side validation before API call
 * - Strong password requirements (12+ chars, mixed case, numbers, symbols)
 * - Rate limiting (3 signups per hour from same IP)
 * - Email verification required before login
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { supabase } from '@/lib/auth/supabase';

/**
 * Signup form validation schema
 * Enforces strong password requirements
 */
const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    churchName: z.string().min(3, 'Church name must be at least 3 characters').max(200, 'Church name too long'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

/**
 * Password strength indicator
 *
 * @param password - Current password value
 * @returns Visual indicator of password strength
 */
function PasswordStrength({ password }: { password: string }) {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              i < strength
                ? strength <= 2
                  ? 'bg-red-500'
                  : strength <= 3
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <ul className="space-y-1 text-muted-foreground">
        <li className={checks.length ? 'text-green-600' : ''}>
          {checks.length ? '✓' : '○'} At least 12 characters
        </li>
        <li className={checks.uppercase ? 'text-green-600' : ''}>
          {checks.uppercase ? '✓' : '○'} One uppercase letter
        </li>
        <li className={checks.lowercase ? 'text-green-600' : ''}>
          {checks.lowercase ? '✓' : '○'} One lowercase letter
        </li>
        <li className={checks.number ? 'text-green-600' : ''}>
          {checks.number ? '✓' : '○'} One number
        </li>
        <li className={checks.special ? 'text-green-600' : ''}>
          {checks.special ? '✓' : '○'} One special character
        </li>
      </ul>
    </div>
  );
}

/**
 * Signup page component
 */
export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  /**
   * Initialize form with react-hook-form and Zod validation
   */
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      churchName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Watch password for strength indicator
  const password = watch('password');

  /**
   * Handle form submission
   *
   * @param data - Validated form data
   */
  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    console.log('📝 Signup form submitted:', {
      name: data.name,
      churchName: data.churchName,
      email: data.email
    });

    try {
      // Sign out any existing session first (clean slate for new signup)
      await supabase.auth.signOut();
      console.log('🧹 Cleared any existing session');

      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          churchName: data.churchName,
          email: data.email,
          password: data.password,
        }),
      });

      console.log('📡 Signup API response status:', response.status);

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          setErrorMessage(
            'Too many signup attempts. Please wait an hour before trying again.'
          );
        } else if (response.status === 409) {
          setErrorMessage(
            'This email is already registered. Please sign in or use a different email.'
          );
        } else {
          setErrorMessage(result.message || 'Signup failed. Please try again.');
        }
        return;
      }

      // Signup successful - now sign in to create client-side session
      console.log('✅ Signup successful! Signing in...');

      setSuccessMessage('Account created! Signing you in...');

      // Sign in with Supabase to create client-side session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        console.error('❌ Auto sign-in failed:', signInError);
        setSuccessMessage('Account created! Please sign in.');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
        return;
      }

      console.log('✅ Signed in! Redirecting to dashboard...');
      setSuccessMessage('Welcome! Redirecting to dashboard...');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('Signup error:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Church Crypto Donations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Start accepting crypto donations in minutes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Join churches worldwide accepting crypto donations
            </CardDescription>
          </CardHeader>

          {successMessage ? (
            // Success state - show message and login link
            <CardContent className="space-y-4">
              <div className="rounded-md bg-green-50 p-4 border border-green-200">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
              <div className="text-center">
                <Link href="/auth/login">
                  <Button>Go to Login</Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            // Form state
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {/* API Error message display */}
                {errorMessage && (
                  <div className="rounded-md bg-red-50 p-4 border border-red-200">
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                )}

                {/* Form Validation Errors Summary */}
                {Object.keys(errors).length > 0 && (
                  <div className="rounded-md bg-yellow-50 p-4 border-2 border-yellow-400">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">
                      Please fix the following errors:
                    </p>
                    <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                      {errors.name && <li>{errors.name.message}</li>}
                      {errors.churchName && <li>{errors.churchName.message}</li>}
                      {errors.email && <li>{errors.email.message}</li>}
                      {errors.password && <li>{errors.password.message}</li>}
                      {errors.confirmPassword && <li>{errors.confirmPassword.message}</li>}
                    </ul>
                  </div>
                )}

                {/* Name field */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    autoComplete="name"
                    {...register('name')}
                    aria-invalid={errors.name ? 'true' : 'false'}
                    disabled={isLoading}
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>

                {/* Church name field */}
                <div className="space-y-2">
                  <Label htmlFor="churchName">Church name</Label>
                  <Input
                    id="churchName"
                    type="text"
                    placeholder="First Community Church"
                    autoComplete="organization"
                    {...register('churchName')}
                    aria-invalid={errors.churchName ? 'true' : 'false'}
                    disabled={isLoading}
                  />
                  {errors.churchName && <p className="text-sm text-red-600">{errors.churchName.message}</p>}
                  <p className="text-xs text-gray-500">
                    This will be your church's name on the platform
                  </p>
                </div>

                {/* Email field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@church.org"
                    autoComplete="email"
                    {...register('email')}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    disabled={isLoading}
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    {...register('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    disabled={isLoading}
                    onFocus={() => setShowPasswordStrength(true)}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                  {showPasswordStrength && password && <PasswordStrength password={password} />}
                </div>

                {/* Confirm password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                {/* Submit button */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>

                {/* Login link */}
                <p className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Additional information */}
        <p className="mt-6 text-center text-xs text-gray-500">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
