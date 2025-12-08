/**
 * Help Article Management
 *
 * Utilities for reading and managing help/education articles.
 * Articles are stored as markdown files in /content/help/
 *
 * Directory structure:
 * content/help/
 *   getting-started/
 *     index.md
 *     create-wallet.md
 *   crypto-basics/
 *     index.md
 *     what-is-bitcoin.md
 *   using-dashboard/
 *     index.md
 *     monitoring-balances.md
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const contentDirectory = path.join(process.cwd(), 'content', 'help');

/**
 * Article metadata from frontmatter
 */
export interface ArticleMetadata {
  title: string;
  description: string;
  category: string;
  order?: number;
  tags?: string[];
  updatedAt?: string;
  author?: string;
}

/**
 * Full article with content
 */
export interface Article {
  slug: string;
  category: string;
  metadata: ArticleMetadata;
  content: string;
  htmlContent: string;
}

/**
 * Article summary for listing
 */
export interface ArticleSummary {
  slug: string;
  category: string;
  title: string;
  description: string;
  order: number;
}

/**
 * Category information
 */
export interface Category {
  slug: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  articleCount: number;
}

/**
 * Get all categories
 */
export function getCategories(): Category[] {
  const categories: Category[] = [
    {
      slug: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of setting up and using the platform',
      icon: '🚀',
      order: 1,
      articleCount: 0,
    },
    {
      slug: 'crypto-basics',
      title: 'Crypto Basics',
      description: 'Understanding cryptocurrency fundamentals',
      icon: '📚',
      order: 2,
      articleCount: 0,
    },
    {
      slug: 'using-dashboard',
      title: 'Using the Dashboard',
      description: 'Complete guide to all dashboard features',
      icon: '💻',
      order: 3,
      articleCount: 0,
    },
  ];

  // Count articles in each category
  categories.forEach((category) => {
    const categoryPath = path.join(contentDirectory, category.slug);
    if (fs.existsSync(categoryPath)) {
      const files = fs.readdirSync(categoryPath);
      category.articleCount = files.filter((file) => file.endsWith('.md')).length;
    }
  });

  return categories;
}

/**
 * Get all articles in a category
 */
export function getArticlesByCategory(categorySlug: string): ArticleSummary[] {
  const categoryPath = path.join(contentDirectory, categorySlug);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  const files = fs.readdirSync(categoryPath);
  const articles: ArticleSummary[] = [];

  files.forEach((fileName) => {
    if (!fileName.endsWith('.md')) return;

    const slug = fileName.replace(/\.md$/, '');
    const filePath = path.join(categoryPath, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);

    articles.push({
      slug,
      category: categorySlug,
      title: data.title || slug,
      description: data.description || '',
      order: data.order || 999,
    });
  });

  // Sort by order
  return articles.sort((a, b) => a.order - b.order);
}

/**
 * Get a specific article
 */
export async function getArticle(
  categorySlug: string,
  articleSlug: string
): Promise<Article | null> {
  const filePath = path.join(contentDirectory, categorySlug, `${articleSlug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  // Convert markdown to HTML
  const processedContent = await remark().use(html).process(content);
  const htmlContent = processedContent.toString();

  return {
    slug: articleSlug,
    category: categorySlug,
    metadata: data as ArticleMetadata,
    content,
    htmlContent,
  };
}

/**
 * Get all articles (for search, etc.)
 */
export function getAllArticles(): ArticleSummary[] {
  const categories = getCategories();
  const allArticles: ArticleSummary[] = [];

  categories.forEach((category) => {
    const articles = getArticlesByCategory(category.slug);
    allArticles.push(...articles);
  });

  return allArticles;
}

/**
 * Search articles by query
 */
export function searchArticles(query: string): ArticleSummary[] {
  const allArticles = getAllArticles();
  const lowerQuery = query.toLowerCase();

  return allArticles.filter((article) => {
    return (
      article.title.toLowerCase().includes(lowerQuery) ||
      article.description.toLowerCase().includes(lowerQuery)
    );
  });
}
