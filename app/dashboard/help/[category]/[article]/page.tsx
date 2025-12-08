/**
 * Help Article Page
 *
 * Displays a single help article with full content.
 * Dynamic route: /dashboard/help/[category]/[article]
 *
 * Example: /dashboard/help/getting-started/create-wallet
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getArticle, getArticlesByCategory } from '@/lib/help/articles';

/**
 * Article page component
 */
export default async function HelpArticlePage({
  params,
}: {
  params: { category: string; article: string };
}) {
  const { category, article: articleSlug } = params;

  // Get the article
  const article = await getArticle(category, articleSlug);

  if (!article) {
    notFound();
  }

  // Get other articles in this category for navigation
  const categoryArticles = getArticlesByCategory(category);
  const otherArticles = categoryArticles.filter((a) => a.slug !== articleSlug && a.slug !== 'index');

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/help">
            <Button variant="ghost" size="sm">Help Center</Button>
          </Link>
          <span className="text-gray-400">/</span>
          <Link href={`/dashboard/help/${category}`}>
            <Button variant="ghost" size="sm" className="capitalize">
              {category.replace('-', ' ')}
            </Button>
          </Link>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Dashboard</Button>
        </Link>
      </div>

      {/* Article Content */}
      <article>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{article.metadata.title}</CardTitle>
            {article.metadata.description && (
              <p className="text-gray-600 text-base mt-2">
                {article.metadata.description}
              </p>
            )}
            {article.metadata.updatedAt && (
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date(article.metadata.updatedAt).toLocaleDateString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: article.htmlContent }}
            />
          </CardContent>
        </Card>
      </article>

      {/* Related Articles */}
      {otherArticles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            More in this category
          </h2>
          <div className="space-y-3">
            {otherArticles.map((relatedArticle) => (
              <Link
                key={relatedArticle.slug}
                href={`/dashboard/help/${category}/${relatedArticle.slug}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {relatedArticle.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {relatedArticle.description}
                        </p>
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Link href={`/dashboard/help/${category}`}>
          <Button variant="outline">← Back to {category.replace('-', ' ')}</Button>
        </Link>
        <Link href="/dashboard/help">
          <Button variant="outline">Browse all articles</Button>
        </Link>
      </div>

      {/* Helpful? Feedback (placeholder for future) */}
      <Card className="mt-8 bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Was this article helpful?</h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled>
              👍 Yes
            </Button>
            <Button variant="outline" size="sm" disabled>
              👎 No
            </Button>
            <span className="text-sm text-gray-500">(Feedback coming soon)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
