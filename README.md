# Impact Perfumes — Storefront

Next.js 14 (App Router) storefront for Impact Perfumes. Headless commerce powered by Medusa.js, content by Sanity.

## Stack

- **Framework**: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **Commerce**: Medusa.js (separate backend)
- **CMS**: Sanity (free tier)
- **Hosting**: Netlify
- **Payments**: Paystack + Flutterwave
- **Email**: Resend
- **CRM**: HubSpot (B2B inquiries)

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in env values
npm run dev
```

The dev server runs on http://localhost:3000.

## Project structure

```
src/
├─ app/                  App Router routes
│  ├─ (storefront)/
│  ├─ (commerce)/        cart, checkout, order
│  ├─ studio/            Embedded Sanity Studio
│  └─ api/               Route handlers (payments, webhooks)
├─ components/
│  ├─ primitives/        Atoms — Button, Input, Typography
│  ├─ ui/                Composites — ProductCard, FilterGroup
│  ├─ commerce/          Cart, Checkout, PDP blocks
│  ├─ layout/            Header, MegaMenu, Footer
│  └─ sections/          Page-level section blocks
├─ hooks/
├─ lib/
│  ├─ cn.ts              Tailwind class merger
│  ├─ format.ts          formatNaira, truncate, etc.
│  ├─ medusa.ts          Medusa client
│  └─ sanity.ts          Sanity client + image URL builder
├─ sanity/
│  ├─ schemas/
│  └─ queries/
├─ store/                Zustand stores
└─ types/
```

## Design tokens

Set in `tailwind.config.ts` and reflected in Figma:

| Token | Value |
|---|---|
| Bone | `#F8F5EF` |
| Ink | `#1A1612` |
| Accent | `#6B4423` |
| Stone | `#C9C2B5` |
| Mist | `#E8E2D6` |
| Slate | `#5A554E` |

Display font: Cormorant Garamond. Body: Manrope. Both loaded via `next/font/google`.

## Deployment

Connected to Netlify with the `@netlify/plugin-nextjs` runtime. Pushes to `main` deploy to staging.impactperfumes.com.

## Environment variables

See `.env.example`. Production values are managed in Netlify dashboard, never committed.
