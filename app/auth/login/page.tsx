/**
 * Login Page
 *
 * User authentication page with:
 * - Email and password inputs
 * - Form validation using react-hook-form + Zod
 * - Error handling and display
 * - Remember me functionality
 * - Links to signup and password reset
 * - Rate limiting protection
 *
 * Security features:
 * - Client-side validation before API call
 * - Secure error messages (no information leakage)
 * - Rate limiting handled by API
 * - Redirect after successful login
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

/**
 * Login form validation schema
 * Matches server-side validation for consistency
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login page component
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  /**
   * Initialize form with react-hook-form and Zod validation
   */
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  /**
   * Handle form submission
   *
   * @param data - Validated form data
   */
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          setErrorMessage(
            'Too many login attempts. Please wait a few minutes before trying again.'
          );
        } else if (response.status === 403 && result.needsVerification) {
          setErrorMessage(
            'Please verify your email address. Check your inbox for the verification link.'
          );
        } else {
          setErrorMessage(result.message || 'Login failed. Please try again.');
        }
        return;
      }

      // Login successful - redirect to dashboard
      // If user has churches, redirect to dashboard
      // Otherwise, redirect to onboarding
      if (result.churches && result.churches.length > 0) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (error) {
      console.error('Login error:', error);
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
            Accept crypto donations for your church with ease
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access your dashboard
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* Error message display */}
              {errorMessage && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}

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
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register('password')}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...register('rememberMe')}
                  disabled={isLoading}
                />
                <Label htmlFor="rememberMe" className="ml-2 text-sm font-normal">
                  Remember me for 30 days
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              {/* Submit button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              {/* Signup link */}
              <p className="text-center text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                  Sign up for free
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Additional information */}
        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
