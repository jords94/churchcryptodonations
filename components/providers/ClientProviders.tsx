/**
 * Client Providers Component
 *
 * Wraps the app with all client-side providers.
 * This is separated from the root layout because providers
 * must be client components ('use client'), but the layout
 * should remain a server component for optimal performance.
 *
 * Providers included:
 * - AuthProvider: User authentication and church context
 */

'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
