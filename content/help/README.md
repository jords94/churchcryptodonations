# Help Center Content

This directory contains all help/education articles for the dashboard.

## Quick Start for Content Editors

### To Add a New Article:

1. **Choose a category** (or create a new one):
   - `getting-started/` - Platform setup
   - `crypto-basics/` - Crypto education
   - `using-dashboard/` - Feature guides

2. **Create a new .md file** in the category folder:
   ```bash
   touch content/help/getting-started/your-article.md
   ```

3. **Add frontmatter** at the top:
   ```markdown
   ---
   title: Your Article Title
   description: Brief description
   category: getting-started
   order: 3
   ---
   ```

4. **Write your content** in Markdown

5. **Save and test** - article appears automatically!

## File Structure

```
content/help/
├── getting-started/
│   ├── index.md           # Category overview (required)
│   ├── create-wallet.md   # Individual articles
│   └── ...
├── crypto-basics/
│   └── ...
└── using-dashboard/
    └── ...
```

## URL Structure

- Category: `/dashboard/help/getting-started`
- Article: `/dashboard/help/getting-started/create-wallet`

## Full Documentation

See `/CONTENT_EDITOR_GUIDE.md` for complete instructions, templates, and best practices.

## Adding a New Category

1. Create folder: `mkdir content/help/new-category`
2. Add `index.md` file
3. Update `lib/help/articles.ts`
4. Update `app/dashboard/help/page.tsx`

That's it! Happy writing! 📝
