---
description: How to create a new strategy article with proper SEO schema
---

# Creating a New Strategy Article

This workflow describes how to create SEO-optimized articles for the FlagSketch Strategy Knowledge Base.

## 1. Choose the Category

Articles go in one of these directories:
- `/strategy/coaching-guides/` - Practice plans, drills, fundamentals
- `/strategy/offense/` - Route concepts, formations, scoring strategies  
- `/strategy/defense/` - Zone/man coverage, schemes, defensive tips

## 2. Create the Article Directory

Create a new folder with a URL-friendly slug:
```
/strategy/[category]/[article-slug]/index.html
```

Example: `/strategy/coaching-guides/teaching-qb-footwork/index.html`

## 3. Required HTML Structure

Every article MUST include:

### A. Navigation (use unified 4-bucket dropdown)
```html
<nav class="nav-actions">
    <div class="nav-dropdown">
        <a href="/strategy/" class="nav-link">Resources</a>
        <div class="dropdown-menu">
            <a href="/play-templates/">Play Templates</a>
            <a href="/strategy/coaching-guides/">Coaching Guides</a>
            <a href="/strategy/offense/">Offense Tips</a>
            <a href="/strategy/defense/">Defense Tips</a>
        </div>
    </div>
    ...
</nav>
```

### B. Breadcrumbs
```html
<div class="breadcrumbs">
    <a href="/">Home</a> &gt;
    <a href="/strategy/">Strategy</a> &gt;
    <a href="/strategy/[category]/">[Category Name]</a> &gt;
    <span>[Article Title]</span>
</div>
```

### C. Article Schema (CRITICAL for Google Rich Results)

**IMPORTANT**: This schema must include all fields to pass Google's Rich Results Test:

```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "[Full Article Title - max 110 characters]",
    "image": [
        "https://flagsketch.com/images/logo.png"
    ],
    "datePublished": "[YYYY-MM-DDTHH:MM:SS-08:00]",
    "dateModified": "[YYYY-MM-DDTHH:MM:SS-08:00]",
    "description": "[Article meta description - max 160 characters]",
    "author": {
        "@type": "Organization",
        "name": "FlagSketch",
        "url": "https://flagsketch.com"
    },
    "publisher": {
        "@type": "Organization",
        "name": "FlagSketch",
        "url": "https://flagsketch.com",
        "logo": {
            "@type": "ImageObject",
            "url": "https://flagsketch.com/images/logo.png"
        }
    }
}
</script>
```

**Schema Field Requirements**:
| Field | Required | Format |
|-------|----------|--------|
| `headline` | Yes | String, max 110 chars |
| `image` | Yes | Array with at least one absolute URL |
| `datePublished` | Yes | ISO 8601 with timezone: `2026-01-14T08:00:00-08:00` |
| `dateModified` | Yes | Same format as datePublished |
| `author.url` | Yes | Must include URL for Organization |
| `publisher.logo` | Yes | ImageObject with absolute URL |

### D. Breadcrumb Schema
```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://flagsketch.com/"
        },
        {
            "@type": "ListItem",
            "position": 2,
            "name": "Strategy",
            "item": "https://flagsketch.com/strategy/"
        },
        {
            "@type": "ListItem",
            "position": 3,
            "name": "[Category]",
            "item": "https://flagsketch.com/strategy/[category]/"
        },
        {
            "@type": "ListItem",
            "position": 4,
            "name": "[Article Title]"
        }
    ]
}
</script>
```

## 4. Optional: Additional Schema Types

Add these schemas for enhanced Rich Results:

### HowTo Schema (for step-by-step guides)
```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to [Do Something]",
    "totalTime": "PT60M",
    "step": [
        {"@type": "HowToStep", "name": "Step 1", "text": "...", "position": 1}
    ]
}
</script>
```

### FAQPage Schema (for Q&A content)
```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "What is...?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "..."
            }
        }
    ]
}
</script>
```

## 5. Required CSS

Include these stylesheets:
```html
<link rel="stylesheet" href="/css/landing.css">
<link rel="stylesheet" href="/css/templates.css">
<link rel="stylesheet" href="/css/strategy.css">
```

## 6. Update Hub Pages

After creating the article:
1. Add a link to the article in the parent category hub (`/strategy/[category]/index.html`)
2. Consider adding to "New to Coaching? Start Here" on `/strategy/index.html` if relevant

## 7. Regenerate Sitemap

Run the sitemap generator to include the new article:
```bash
python3 scripts/generate_sitemap.py
```

## 8. Test Before Publishing

1. Validate schema at: https://search.google.com/test/rich-results
2. Check mobile responsiveness
3. Verify all internal links work

## 9. Push and Deploy

```bash
git add -A
git commit -m "Add article: [Article Title]"
git push
```
