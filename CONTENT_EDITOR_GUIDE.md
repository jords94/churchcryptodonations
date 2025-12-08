# Content Editor Guide
## Adding Educational Articles to the Help Center

This guide explains how to add new articles to the help/education section of the dashboard.

---

## 📁 **Content Structure**

All help articles are stored in `/content/help/` as Markdown files (.md).

```
content/help/
├── getting-started/
│   ├── index.md                    # Category overview
│   ├── create-wallet.md            # Article 1
│   └── import-wallet.md            # Article 2
├── crypto-basics/
│   ├── index.md                    # Category overview
│   ├── what-is-bitcoin.md          # Article 1
│   └── what-is-usdc.md             # Article 2
└── using-dashboard/
    ├── index.md                    # Category overview
    ├── monitoring-balances.md      # Article 1
    └── generating-qr-codes.md      # Article 2
```

---

## ✍️ **How to Add a New Article**

### Step 1: Choose or Create a Category

**Existing Categories:**
- `getting-started` - Platform setup and basics
- `crypto-basics` - Cryptocurrency education
- `using-dashboard` - Dashboard features

**To add a new category:**
1. Create a folder in `/content/help/your-category-name/`
2. Add an `index.md` file (see template below)
3. Update `lib/help/articles.ts` to add your category info

### Step 2: Create Your Article File

1. Navigate to the category folder: `/content/help/getting-started/`
2. Create a new file: `your-article-name.md`
3. Use kebab-case for filename (e.g., `what-is-bitcoin.md`)

### Step 3: Add Frontmatter

Every article MUST start with frontmatter (metadata):

```markdown
---
title: Your Article Title
description: Brief description of what this article covers
category: getting-started
order: 2
tags: [wallet, setup, beginner]
updatedAt: 2025-12-07
---
```

**Required Fields:**
- `title`: Article title (shown in listings and page header)
- `description`: Brief summary (shown in cards)
- `category`: Must match folder name
- `order`: Number for sorting (lower = shown first)

**Optional Fields:**
- `tags`: Array of keywords
- `updatedAt`: Last update date (YYYY-MM-DD)
- `author`: Author name

### Step 4: Write Your Content

After the frontmatter, write your article in **Markdown** format.

**Example Article:**

```markdown
---
title: How to Create a Bitcoin Wallet
description: Step-by-step guide to creating your first BTC wallet
category: getting-started
order: 2
tags: [bitcoin, wallet, beginner]
updatedAt: 2025-12-07
---

# How to Create a Bitcoin Wallet

Creating a Bitcoin wallet is easy! Follow these steps...

## Step 1: Navigate to Create Wallet

From your dashboard, click the **"Create Wallet"** button.

## Step 2: Choose Bitcoin

Select **Bitcoin (BTC)** from the list of cryptocurrencies.

## Step 3: Save Your Seed Phrase

**Important:** Write down your 12-word seed phrase and store it safely.

---

**Next Steps:**
- [Import an Existing Wallet](import-wallet)
- [Generate QR Codes](../using-dashboard/generating-qr-codes)
```

### Step 5: Test Your Article

1. Restart your dev server: `npm run dev`
2. Visit: `http://localhost:3000/dashboard/help`
3. Navigate to your category
4. Your article should appear automatically!

---

## 📝 **Markdown Formatting Guide**

### Headings

```markdown
# H1 - Page Title
## H2 - Major Section
### H3 - Subsection
#### H4 - Minor Subsection
```

### Text Formatting

```markdown
**Bold text**
*Italic text*
~~Strikethrough~~
`Inline code`
```

### Lists

```markdown
Unordered list:
- Item 1
- Item 2
  - Nested item

Numbered list:
1. First step
2. Second step
3. Third step
```

### Links

```markdown
[Link text](https://example.com)
[Link to another article](../crypto-basics/what-is-bitcoin)
[Email link](mailto:support@example.com)
```

### Images

```markdown
![Alt text](/images/screenshot.png)
```

(Note: Store images in `/public/images/help/`)

### Blockquotes

```markdown
> This is a quote or callout
```

### Code Blocks

```markdown
```bash
npm run dev
```
```

### Tables

```markdown
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |
```

### Horizontal Rule

```markdown
---
```

---

## 🎨 **Content Best Practices**

### Writing Style

✅ **DO:**
- Write in clear, simple language
- Use short paragraphs (2-3 sentences)
- Include lots of headings for scannability
- Add images/screenshots when helpful
- Use bullet points and numbered lists
- Link to related articles
- Include "Next Steps" at the end

❌ **DON'T:**
- Use jargon without explaining it
- Write long walls of text
- Assume too much knowledge
- Skip important warnings/notes
- Forget to update the `updatedAt` field

### Structure

Every article should have:

1. **Introduction** - What this article covers
2. **Main Content** - Step-by-step or explanatory content
3. **Important Notes** - Security warnings, tips, etc.
4. **Next Steps** - Links to related articles

### Example Structure:

```markdown
---
title: Article Title
description: Brief description
category: category-name
order: 1
---

# Article Title

Brief introduction explaining what this article covers.

## Main Section

Step-by-step instructions or explanation...

### Subsection

More details...

## Important Notes

⚠️ Warning or important information here.

## Next Steps

- [Related Article 1](link)
- [Related Article 2](link)

---

**Need help?** Contact support or browse other articles.
```

---

## 🏷️ **Categories Explained**

### Getting Started
For beginners setting up the platform:
- Account creation
- First wallet setup
- Basic navigation
- Security setup

### Crypto Basics
Educational content about cryptocurrency:
- What is Bitcoin/USDC?
- How blockchain works
- Wallet concepts
- Transaction basics
- Security fundamentals

### Using Dashboard
Feature-specific guides:
- Wallet management
- QR code generation
- Balance monitoring
- Swap/withdraw features
- Settings and preferences

---

## 🔧 **Advanced: Adding a New Category**

If you need to add a completely new category (beyond the 3 existing):

### 1. Create the Folder

```bash
mkdir content/help/your-category
```

### 2. Create index.md

```markdown
---
title: Your Category Name
description: What this category covers
category: your-category
order: 1
---

# Your Category Name

Overview of what this category covers...

## Topics Covered

- Topic 1
- Topic 2
- Topic 3

---

**Start Learning:**
- [First Article](first-article)
- [Second Article](second-article)
```

### 3. Update lib/help/articles.ts

Edit `/lib/help/articles.ts` and add your category to the `categories` array:

```typescript
{
  slug: 'your-category',
  title: 'Your Category Name',
  description: 'Brief description',
  icon: '🔧',  // Choose an emoji
  order: 4,    // Determines display order
  articleCount: 0,
},
```

### 4. Update Help Homepage

Edit `/app/dashboard/help/page.tsx` and add your category to the hardcoded list:

```typescript
{
  slug: 'your-category',
  title: 'Your Category Name',
  description: 'Brief description',
  icon: '🔧',
  articleCount: 0,
},
```

---

## 🔍 **Finding Articles by URL**

URLs follow this pattern:

- Homepage: `/dashboard/help`
- Category: `/dashboard/help/getting-started`
- Article: `/dashboard/help/getting-started/create-wallet`

The URL is automatically generated from:
- Category folder name
- Article filename (without .md)

---

## ✅ **Quick Checklist**

Before publishing an article, verify:

- [ ] Frontmatter is complete and correct
- [ ] Title is clear and descriptive
- [ ] Description summarizes the content
- [ ] Order number is set appropriately
- [ ] Content is in valid Markdown
- [ ] Links to other articles work
- [ ] Images are in `/public/images/help/`
- [ ] No typos or grammatical errors
- [ ] Tested in browser
- [ ] Article appears in category listing

---

## 🆘 **Common Issues & Solutions**

### Issue: Article doesn't appear

**Solution:**
- Check frontmatter is valid YAML
- Ensure `category` matches folder name
- Restart dev server: `npm run dev`
- Check filename ends with `.md`

### Issue: Formatting looks wrong

**Solution:**
- Validate Markdown syntax
- Check for unclosed code blocks
- Ensure proper spacing around headings
- Test in Markdown preview tool

### Issue: Links don't work

**Solution:**
- Use relative paths for internal links
- For same category: `[Link](article-name)`
- For other category: `[Link](../category/article-name)`
- For external: `[Link](https://example.com)`

### Issue: Images don't show

**Solution:**
- Place images in `/public/images/help/`
- Reference as: `![Alt](/images/help/image.png)`
- Don't include `/public/` in path

---

## 📊 **Content Statistics**

You can see article counts on the help homepage. To add article tracking:

1. Articles auto-count based on `.md` files
2. Category overview shows count
3. Search will index all articles (coming soon)

---

## 🎯 **Content Roadmap Ideas**

### Getting Started
- [ ] Account setup guide
- [ ] Security best practices
- [ ] Troubleshooting common issues
- [ ] FAQ

### Crypto Basics
- [ ] What is blockchain?
- [ ] Understanding wallet addresses
- [ ] Transaction fees explained
- [ ] How to verify transactions
- [ ] Price volatility explained

### Using Dashboard
- [ ] Advanced wallet management
- [ ] Batch operations
- [ ] Export reports
- [ ] API integration guide

### New Categories (Ideas)
- [ ] **For Donors** - How to donate crypto
- [ ] **Tax & Compliance** - Legal considerations
- [ ] **Troubleshooting** - Common problems
- [ ] **Video Tutorials** - Embedded guides

---

## 📞 **Need Help?**

If you have questions about adding content:

1. Check this guide first
2. Review existing articles as examples
3. Look at the sample articles in `/content/help/`
4. Contact the development team

---

**Last Updated:** December 7, 2025
**Version:** 1.0.0
