/**
 * Help Category Page
 *
 * Shows all articles in a specific category.
 * Dynamic route: /dashboard/help/[category]
 *
 * Example: /dashboard/help/getting-started
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getArticle, getArticlesByCategory } from '@/lib/help/articles';

/**
 * Category page component
 */
export default async function HelpCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const { category } = params;

  // Get category index page
  const indexArticle = await getArticle(category, 'index');

  if (!indexArticle) {
    notFound();
  }

  // Get all articles in this category
  const articles = getArticlesByCategory(category);

  // Remove index from list
  const otherArticles = articles.filter((a) => a.slug !== 'index');

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/help">
          <Button variant="outline">← Back to Help Center</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>

      {/* Category Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl">{indexArticle.metadata.title}</CardTitle>
          <CardDescription className="text-base">
            {indexArticle.metadata.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-blue max-w-none"
            dangerouslySetInnerHTML={{ __html: indexArticle.htmlContent }}
          />
        </CardContent>
      </Card>

      {/* Articles in this category */}
      {otherArticles.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Articles in This Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/dashboard/help/${category}/${article.slug}`}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {article.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-600 hover:underline">
                      Read article →
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add Article Notice (for content editors) */}
      <Card className="mt-8 bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            ✏️ Content Editor Instructions
          </h3>
          <p className="text-sm text-gray-700 mb-2">
            To add a new article to this category:
          </p>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Create a new `.md` file in `/content/help/{category}/`</li>
            <li>Add frontmatter with title, description, category, and order</li>
            <li>Write your content in Markdown format</li>
            <li>The article will automatically appear here!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
