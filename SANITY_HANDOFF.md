# Sanity Setup — Handoff for Claude Code

The Sanity project is live. This file contains everything Claude Code needs to wire up schemas, queries, and the embedded Studio. Paste this into your next Claude Code session along with `BUILD_BRIEF.md`.

## Values to put in `.env.local`

```
NEXT_PUBLIC_SANITY_PROJECT_ID=rryknw9w
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=skRQoJBDht7sTyHDQ27zlF8e5dG0edAe8IHYtnlcRUg5luXUEdI8xfFbzTF0xJqFIeZoRLTq85dzMA9JCPge0yoA62F9SWVZuVTKlSRKHHpG0KHgV4tZ63xBfYrVamXrdj4smzwhOmpnfDeEZwI4nkk5r4MybhK4QQ8YGB96dIP21SEFTfd3
```

> Treat the read token as a secret. It's read-only/published-content scope, but rotate it after launch if you've shared the workspace publicly.

## What's already in place

- Project ID: `rryknw9w`
- Organization ID: `oJMxGfFXK`
- Plan: Growth Trial → drops to Free after 30 days (still adequate)
- Dataset: `production` (default, auto-created)
- API token: "Storefront Read" with Viewer role (above)
- CORS origins (with credentials): `http://localhost:3000`, `http://localhost:3333`, `https://staging.impactperfumes.com`

## What Claude Code should build

### 1. Install Sanity packages

```bash
npm install sanity @sanity/vision @portabletext/react @sanity/image-url
```

(`next-sanity` and `@sanity/client` are already in package.json from the scaffold.)

### 2. Create `sanity.config.ts` at the project root

```ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemas";

export default defineConfig({
  name: "impact-perfumes",
  title: "Impact Perfumes",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
```

### 3. Embed Studio at `/studio`

Create `src/app/studio/[[...tool]]/page.tsx`:

```tsx
"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
```

### 4. Create schemas in `src/sanity/schemas/`

Index file `src/sanity/schemas/index.ts`:

```ts
import siteSettings from "./siteSettings";
import navigation from "./navigation";
import journalPost from "./journalPost";
import author from "./author";
import perfumer from "./perfumer";
import fragranceNote from "./fragranceNote";
import productEnrichment from "./productEnrichment";
import houseStorySection from "./houseStorySection";
import page from "./page";
import inquiry from "./inquiry";
import review from "./review";

export const schemaTypes = [
  siteSettings,
  navigation,
  journalPost,
  author,
  perfumer,
  fragranceNote,
  productEnrichment,
  houseStorySection,
  page,
  inquiry,
  review,
];
```

#### `siteSettings.ts` (singleton)

Fields: `title` (string), `tagline` (string), `description` (text), `logo` (image), `defaultOgImage` (image), `freeShippingThresholdNgnKobo` (number), `instagram` (url), `whatsapp` (string), `email` (email), `address` (text). Use `__experimental_actions: ["update", "publish"]` so it can't be duplicated.

#### `navigation.ts` (singleton)

Fields: `mainNav` (array of `{label: string, href: string, megaMenu: array}`), `footerColumns` (array of `{title: string, links: array}`). MegaMenu items: `{label, href, group?}`.

#### `journalPost.ts`

Fields: `title` (string, required), `slug` (slug source title, required), `category` (string with options: Scent Stories, Behind the Bottle, Gifting, Craft, House News), `excerpt` (text, max 200), `hero` (image with alt, required), `body` (Portable Text array with custom blocks: image, pullQuote, productCallout), `author` (reference to author), `publishedAt` (datetime, required), `seo` (object: metaTitle, metaDescription, ogImage). Order: `publishedAt desc`.

#### `author.ts`

Fields: `name` (string), `role` (string), `image` (image with alt), `bio` (text).

#### `perfumer.ts`

Fields: `name` (string, required), `slug` (slug), `image` (image with alt), `bio` (text), `signature` (string — their signature scent style).

#### `fragranceNote.ts`

Fields: `name` (string, required), `slug` (slug), `family` (string with options: Citrus, Floral, Woody, Oriental, Oud, Spicy, Aromatic, Gourmand, Fresh, Animalic), `description` (text, max 200), `image` (image, optional).

#### `productEnrichment.ts`

This is the bridge between Medusa products and Sanity content.

Fields:

- `productHandle` (string, required, unique — matches Medusa product handle)
- `tagline` (string — the italic descriptor under product name)
- `story` (text 100–150 words)
- `perfumer` (reference to perfumer)
- `topNotes` (array of references to fragranceNote)
- `heartNotes` (array of references to fragranceNote)
- `baseNotes` (array of references to fragranceNote)
- `longevity` (number 1–5)
- `sillage` (number 1–5)
- `occasions` (array of strings: Day, Evening, Office, Date, Celebration, Travel)
- `concentration` (string: EDT, EDP, Parfum, Extrait)
- `lifestyleImages` (array of images with alt — supplementary to Medusa product images)
- `craftIngredients` (array of strings)
- `careInstructions` (text)
- `pairsWith` (array of references to other productEnrichment)

#### `houseStorySection.ts`

Fields: `eyebrow` (string), `heading` (string, required), `body` (Portable Text), `image` (image with alt), `imagePosition` (string: left, right, full-bleed), `order` (number). Order in Studio by `order asc`.

#### `page.ts`

Generic page for legal/terms/etc. Fields: `title`, `slug`, `body` (Portable Text), `seo` object.

#### `inquiry.ts`

B2B inquiry submissions. Fields: `type` (string: Bespoke, Scenting Solutions, Partnerships), `name`, `company`, `email`, `phone`, `budget`, `message` (text), `status` (string: New, In Review, Closed), `submittedAt` (datetime). Read-only for editors after creation.

#### `review.ts`

Fields: `productHandle` (string, required), `rating` (number 1–5), `title` (string), `body` (text), `photos` (array of images), `verified` (boolean), `customerName` (string), `customerEmail` (email — for follow-up; not displayed), `status` (string: Pending, Approved, Rejected), `submittedAt` (datetime).

### 5. Create GROQ queries in `src/sanity/queries/index.ts`

```ts
export const siteSettingsQuery = `*[_type == "siteSettings"][0]`;

export const navigationQuery = `*[_type == "navigation"][0]`;

export const journalListQuery = `
  *[_type == "journalPost" && publishedAt < now()] | order(publishedAt desc) [0...$limit] {
    _id, title, slug, category, excerpt, hero, publishedAt,
    author->{ name, image }
  }
`;

export const journalPostQuery = `
  *[_type == "journalPost" && slug.current == $slug][0] {
    ...,
    author->,
    "related": *[_type == "journalPost" && category == ^.category && _id != ^._id] | order(publishedAt desc) [0...3] {
      _id, title, slug, hero, publishedAt
    }
  }
`;

export const productEnrichmentQuery = `
  *[_type == "productEnrichment" && productHandle == $handle][0] {
    ...,
    perfumer->,
    topNotes[]->{ name, family, description },
    heartNotes[]->{ name, family, description },
    baseNotes[]->{ name, family, description },
    pairsWith[]->{ productHandle, tagline }
  }
`;

export const houseStoryQuery = `
  *[_type == "houseStorySection"] | order(order asc) {
    eyebrow, heading, body, image, imagePosition, order
  }
`;

export const pageBySlugQuery = `*[_type == "page" && slug.current == $slug][0]`;

export const reviewsForProductQuery = `
  *[_type == "review" && productHandle == $handle && status == "Approved"] | order(submittedAt desc) {
    _id, rating, title, body, photos, verified, customerName, submittedAt
  }
`;
```

### 6. Update existing `src/lib/sanity.ts`

Replace contents with:

```ts
import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion = "2024-10-01";

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
  perspective: "published",
  token: process.env.SANITY_API_READ_TOKEN,
});

const builder = imageUrlBuilder(sanity);
export function urlFor(source: any) {
  return builder.image(source);
}
```

### 7. Add Studio meta exclusion to `next.config.mjs`

The Studio embeds its own static assets — exclude its routes from prerendering checks. Also allow Sanity's CDN host (already done):

```js
images: {
  remotePatterns: [
    { protocol: "https", hostname: "cdn.sanity.io" },
  ],
},
```

### 8. Verification steps

1. `npm install`
2. `cp .env.example .env.local` and fill in the four Sanity values from the top of this file
3. `npm run dev`
4. Open `http://localhost:3000/studio` — should render Sanity Studio. Sign in with the Sanity account used to create the project.
5. Create one test `siteSettings` doc, one `journalPost`, one `perfumer`, and one `productEnrichment` (with a fake handle like `test-handle`). Confirm they save.
6. From `/some-test-page` (or temporarily in `app/page.tsx`) call `sanity.fetch(siteSettingsQuery)` and verify it returns the document.
7. Run `npm run typecheck && npm run lint && npm run build`. Fix any issues.
8. Commit with: `git commit -m "add sanity studio + schemas"`

## Acceptance criteria for Task 17

- `/studio` route renders the Studio without console errors
- All 11 schemas appear in the Studio sidebar
- Custom desk structure (optional but recommended): regroup as **Shop** (productEnrichment, perfumer, fragranceNote), **Content** (journalPost, author, page, houseStorySection), **Operations** (inquiry, review), **Settings** (siteSettings, navigation)
- Reading documents back from a Server Component using `sanity.fetch(query)` works
- `next.config.mjs` includes `cdn.sanity.io` in image remotePatterns
- All env vars in `.env.local`, none committed

## What this unlocks

Once Task 17 is done, you can move to Task 18 (Paystack/Flutterwave on Medusa — also browser-driven, ping me) or skip ahead to Task 20 (site shell) since Sanity will be ready to source content from.

## Reminder

The `redisUrl not found` warning on Medusa is still parked. Before launch, fix `medusa-config.ts` to wire Redis modules properly using `process.env.REDIS_URL`.
