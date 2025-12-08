/**
 * Help Center Homepage
 *
 * Main landing page for the help/education section.
 * Shows all categories and quick links to popular articles.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Help Center Homepage
 */
export default function HelpCenterPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  /**
   * Redirect if not authenticated
   */
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
        </div>
      </div>
    );
  }

  // Hardcoded categories (your worker can add new ones here)
  const categories = [
    {
      slug: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of setting up and using the platform',
      icon: '🚀',
      articleCount: 2,
    },
    {
      slug: 'crypto-basics',
      title: 'Crypto Basics',
      description: 'Understanding cryptocurrency fundamentals',
      icon: '📚',
      articleCount: 1,
    },
    {
      slug: 'using-dashboard',
      title: 'Using the Dashboard',
      description: 'Complete guide to all dashboard features',
      icon: '💻',
      articleCount: 1,
    },
  ];

  const popularArticles = [
    { category: 'getting-started', slug: 'create-wallet', title: 'How to Create a Wallet' },
    { category: 'crypto-basics', slug: 'what-is-bitcoin', title: 'What is Bitcoin?' },
    { category: 'using-dashboard', slug: 'generating-qr-codes', title: 'Generating QR Codes' },
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📚 Help & Education Center
            </h1>
            <p className="text-lg text-gray-600">
              Learn how to use the platform and understand cryptocurrency
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </Button>
        </div>

        {/* Search Bar (placeholder for future) */}
        <div className="mt-6">
          <input
            type="search"
            placeholder="🔍 Search help articles... (coming soon)"
            disabled
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.slug} href={`/dashboard/help/${category.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="text-5xl mb-3">{category.icon}</div>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    {category.articleCount} article{category.articleCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Articles</h2>
        <div className="space-y-3">
          {popularArticles.map((article) => (
            <Link
              key={`${article.category}-${article.slug}`}
              href={`/dashboard/help/${article.category}/${article.slug}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{article.title}</h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {article.category.replace('-', ' ')}
                        </p>
                      </div>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl">Need More Help?</CardTitle>
          <CardDescription>
            Can't find what you're looking for? Try these options:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h4 className="font-semibold mb-1">Contact Support</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Get help from our support team
                </p>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📹</span>
              <div>
                <h4 className="font-semibold mb-1">Video Tutorials</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Watch step-by-step video guides
                </p>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
