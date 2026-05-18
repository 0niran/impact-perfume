# Impact Perfumes — UX/UI Review
**Date:** May 2026 | **Scope:** Full site audit across layout, visual design, user journeys, interactions, accessibility, and backend

---

## Summary Scorecard

| Area | Severity | Status |
|---|---|---|
| Checkout — form inputs invisible | 🔴 CRITICAL | Bug |
| Checkout — submit button invisible | 🔴 CRITICAL | Bug |
| Product page — NotesPyramid/StrengthBars text invisible | 🔴 CRITICAL | Bug |
| Orders not appearing in Medusa | 🔴 CRITICAL | Config/Bug |
| Hero images too dimmed | 🟠 HIGH | Design |
| Brand color alignment | 🟡 MEDIUM | Design |
| WhatsApp FAB missing | 🟡 MEDIUM | Feature |
| Hero text too large | 🟡 MEDIUM | Design |
| Skip-content button behaviour | 🟢 LOW | Accessibility |
| Quiz discoverability | 🟡 MEDIUM | UX |

---

## 1. Heuristic Review — Prioritised

### 🔴 MUST — Critical bugs (ship-blockers)

---

#### MUST-1 — Checkout form: all inputs and submit button are invisible
**Effort:** Low | **Risk:** Revenue loss

**Root cause:** `FORM_STYLES.input` in `src/lib/shopUtils.ts` uses `text-ink bg-transparent`. The checkout page has no background override, so it inherits the site-wide `bg-ink` body. Black text (`text-ink` = `#0A0A08`) on a black background (`bg-ink` = `#0A0A08`) produces ~1:1 contrast — completely invisible.

The submit button compounds this: `bg-ink text-bone` renders as a black button on a black page — the button is invisible.

`focus:border-ink` on dark background also means keyboard users see no focus ring.

**Fix — `src/lib/shopUtils.ts`:**
```ts
export const FORM_STYLES = {
  input:
    'w-full border border-stone/30 bg-mist px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors',
  label: 'block text-small text-stone mb-1',
} as const
```

**Fix — `src/components/checkout/CheckoutForm.tsx` submit button:**
```tsx
className="mt-6 flex h-[52px] w-full items-center justify-center bg-accent text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
```

**Fix — `src/components/checkout/CheckoutForm.tsx` Country static field:**
```tsx
<p className="px-4 py-3 border border-stone/20 text-body text-bone bg-mist">Nigeria</p>
```

**Test cases:**
- Type in Full Name field — text must be visible
- Tab through all fields — focus border must be visible (gold accent)
- State dropdown — selected option text must be readable
- Submit button must be visually distinct from the page background
- Disabled state (loading) must be visible at 50% opacity

---

#### MUST-2 — PDP: NotesPyramid and StrengthBars section headings invisible
**Effort:** Low | **Risk:** Key product info not visible

**Root cause:** Both `NotesPyramid` and `StrengthBars` use `text-ink` for their section headings and `bg-ink` for the progress bar fill. The InfoRail renders on the dark site background (`bg-ink`) with no background override, making these elements invisible.

**Fix — `src/components/pdp/NotesPyramid.tsx` line 52:**
```tsx
<p className="text-label uppercase tracking-[0.1em] text-stone mb-5">
```

**Fix — `src/components/pdp/StrengthBars.tsx` line 37:**
```tsx
<p className="text-label uppercase tracking-[0.1em] text-stone mb-4">
```

**Fix — `src/components/pdp/StrengthBars.tsx` progress bar fill (line 24):**
```tsx
className="h-full bg-accent transition-all duration-700"
```

**Optional but recommended:** Add `bg-mist` to the InfoRail wrapper so the right panel has a subtle surface distinction from pure `bg-ink`, matching the intended two-panel PDP layout. In `src/components/pdp/InfoRail.tsx`:
```tsx
<div className="lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto bg-mist">
```

---

#### MUST-3 — Orders not appearing in Medusa backend
**Effort:** Medium | **Risk:** Lost orders, no fulfilment

Full diagnosis in Section 6 (Technical Checklist). In brief:

1. `MEDUSA_ADMIN_EMAIL`, `MEDUSA_ADMIN_PASSWORD`, and `NEXT_PUBLIC_MEDUSA_REGION_ID` are in `.env.local` but almost certainly **not** in Vercel production environment variables.
2. `createMedusaOrder` runs inside `Promise.allSettled` — failures are completely silent. No error is thrown, no log written.
3. The Medusa v2 auth endpoint (`/auth/user/emailpass`) may differ from the Medusa version deployed on Railway.
4. A test Paystack key is in use locally — orders processed in test mode will verify successfully locally but the reference won't match what Paystack shows in the live dashboard.

---

### 🟠 SHOULD — High-impact improvements

---

#### SHOULD-1 — Hero images: image opacity too low (0.55)
**Effort:** Low

The image layer renders at `opacity: 0.55`. On top of that sits a permanent vignette gradient with bottom stop at `rgba(10,10,8,0.85)`. The combined effect makes images barely visible — they look like a black page with a slight background hint.

**Fix — `src/components/home/HeroSlideshow.tsx`:**
```tsx
opacity: i === current ? (transitioning ? 0 : 0.78) : 0,
```

Also lighten the vignette mid-stop so images show through in the upper half:
```tsx
background: 'linear-gradient(to top, rgba(10,10,8,0.80) 0%, rgba(10,10,8,0.15) 45%, rgba(10,10,8,0.05) 100%)',
```

This keeps text legibility at the bottom while letting the image breathe in the upper two-thirds.

---

#### SHOULD-2 — Hero text: headline is too large and obscures imagery
**Effort:** Low

The hero h1 renders at `text-display-xl` (80px) on desktop. Combined with a sub-headline at `text-body-l` (18px), a CTA button, and the category label top-right, there is too much text competing with the image.

**Recommendation:** Reduce to `text-display-l` (56px) on desktop, keep the current mobile size. Remove the full tagline sub-headline from the hero — move that message into the HousePositioningStrip which is already dedicated to brand pillars. The hero CTA "Explore Collections" is sufficient alone.

**Fix — `src/components/home/HeroSection.tsx`:**
```tsx
<h1 className="mt-5 max-w-2xl font-display text-[36px] leading-[1.1] sm:text-display-l text-balance">
  Crafted in Lagos.
  <br />
  Composed for character.
</h1>
```

Remove the `<p>` sub-headline beneath the h1 (lines 28–32). The brand statement is already in the HousePositioningStrip immediately below.

---

#### SHOULD-3 — WhatsApp: add persistent FAB fixed to bottom-right
**Effort:** Low

The WhatsApp link exists only in the footer. A fixed bottom-right button is one of the highest-converting touch-points on e-commerce sites targeting markets with high WhatsApp usage.

**Spec:**
- Position: `fixed bottom-6 right-5 z-40` (above page, below cart drawer z-50)
- Background: `#E4B250` (the requested brand gold)
- Icon: filled WhatsApp SVG, 20×20 inside a 52×52 pill
- Label: visually hidden on desktop (`sr-only`), shown on mobile as "Chat with us" alongside icon
- Mobile: full pill expands to show text; collapses to icon-only after 3 seconds via `useState`

**New component — `src/components/layout/WhatsAppFAB.tsx`:**
```tsx
'use client'

import { SITE_CONFIG } from '@/lib/config'

export default function WhatsAppFAB() {
  return (
    <a
      href={SITE_CONFIG.social.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full px-4 shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{ backgroundColor: '#E4B250', height: 52, color: '#0A0A08' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span className="text-label font-medium uppercase tracking-[0.08em] sm:hidden lg:inline">Chat</span>
    </a>
  )
}
```

Add to `src/app/layout.tsx` alongside `<BackToTop />`:
```tsx
import WhatsAppFAB from '@/components/layout/WhatsAppFAB'
// ...
<WhatsAppFAB />
```

---

### 🟡 SHOULD — Medium-impact improvements

---

#### SHOULD-4 — Brand colour: apply #E4B250 as primary CTA accent
**Effort:** Low–Medium

The current `accent` token (`#C9A96E`) is a warm mid-gold with moderate saturation. `#E4B250` is vivid golden-amber — more energetic and distinctive.

**Contrast audit:**
- `#E4B250` on `#0A0A08` (ink): ~9.5:1 ✅ passes AAA for normal text
- `#E4B250` on `#1D1B16` (mist): ~7.8:1 ✅ passes AA
- `#E4B250` on `#F2E6C8` (bone): ~1.7:1 ❌ fails — do NOT use as text on bone backgrounds

**Recommended usage of #E4B250:**
| Element | Use |
|---|---|
| Primary CTA buttons (on dark bg) | Background fill |
| WhatsApp FAB | Background fill |
| Cart badge | Background fill |
| Focus ring | Outline |
| Price display | Text colour |
| Slide indicator progress | Fill |
| Active nav underline | Fill |
| Scent family badge border/text | Stroke + text |

**To apply globally:** update `tailwind.config.ts`:
```ts
accent: "#E4B250",  // vivid amber-gold — CTAs, interactive elements
```

This propagates to every `bg-accent`, `text-accent`, `border-accent` usage site-wide. Review the following areas after the change:
- `bg-accent` buttons: ink text on gold ✅
- `text-accent` body copy: verify legibility on both ink and bone backgrounds
- Cart badge: `bg-accent text-ink` ✅

---

#### SHOULD-5 — Quiz: increase discoverability
**Effort:** Low

The Fragrance Finder quiz is buried as the 5th homepage section, in a muted `bg-mist` container, with a low-weight outlined button. Quiz completion converts browsers into buyers — it deserves higher visual priority.

**Recommendations:**

1. Move the quiz section to position 3 (immediately after CollectionsShowcase, before FeaturedNumbers). Users who browse the collection and don't immediately recognise a scent are the perfect quiz audience.

2. Upgrade the quiz section visual treatment: give it a `bg-accent` (gold) background with `text-ink` content, making it visually pop between two dark sections. This is a common "interrupt strip" pattern.

3. Change the CTA button to solid fill: `bg-ink text-bone` on the gold background.

4. Add a short benefit line beneath the h2, e.g. *"Takes 90 seconds."*

5. Add a persistent quiz teaser on the shop page sidebar/top-bar for users who arrive directly at `/shop` without going through the homepage.

**Revised section background — `src/components/home/HomepageQuizSection.tsx`:**
```tsx
<section className="border-t border-stone/20 py-20 md:py-24" style={{ backgroundColor: '#E4B250' }}>
  <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
    <div className="max-w-lg">
      <p className="text-label uppercase tracking-[0.12em] text-ink/60">Fragrance Finder</p>
      <h2 className="mt-3 font-display text-[28px] md:text-display-s leading-[1.1] text-ink">
        Not sure where to start?
      </h2>
      <p className="mt-3 text-body text-ink/70 max-w-md">
        Five questions. Takes 90 seconds. We match you to your Number.
      </p>
    </div>
    <Link
      href="/quiz"
      className="shrink-0 inline-flex items-center justify-center bg-ink px-10 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity"
      style={{ height: 52 }}
    >
      Find Your Number
    </Link>
  </Container>
</section>
```

---

#### SHOULD-6 — Product pages: fragrance notes placement and visibility
**Effort:** Low (fix existing bug) / Medium (data population)

The `NotesPyramid` component already exists and is wired into the InfoRail. However, it has two issues:

1. **Visibility bug** (covered in MUST-2): `text-ink` headings are invisible on dark background.
2. **Data gap**: The component renders `null` if all three note arrays are empty. If notes haven't been migrated into Medusa metadata for every product, the section silently disappears. Users see no notes at all rather than a placeholder.

**Placement:** The current placement (after StrengthBars, before accordion) is correct. No repositioning needed.

**Data fix:** After fixing the colour bug, verify that notes exist in Medusa metadata for all 50 products by visiting several PDPs and checking the Notes section is visible. If absent, re-run the notes migration script.

**Empty state improvement:** Replace the silent `return null` with a reduced placeholder so users aren't confused:
```tsx
// If all arrays empty, show placeholder instead of nothing
if (topNotes.length === 0 && heartNotes.length === 0 && baseNotes.length === 0) {
  return (
    <div>
      <p className="text-label uppercase tracking-[0.1em] text-stone mb-3">Fragrance Notes</p>
      <p className="text-small text-stone/50 italic">Tasting notes coming soon.</p>
    </div>
  )
}
```

---

### 🟢 CAN — Low-priority refinements

---

#### CAN-1 — Skip-to-content button: explain and refine behaviour
**Effort:** Low

The skip link is **correctly implemented** — this is a standard WCAG 2.4.1 accessibility pattern. Its purpose: keyboard-only users (typically with motor disabilities) can bypass the header navigation and jump directly to main content without tabbing through every nav item on every page.

**Why it currently feels odd:** The button uses `position: fixed` and `top-4`, which means when focused it floats over the header at a fixed position. It should ideally push into the natural document flow so it's clearly above everything.

**Current:** `fixed left-4 top-4 z-[100] -translate-y-full ... focus:translate-y-0`

**Recommended adjustment** — move it above the header in the DOM and use `absolute` positioning so it slides down into view on focus:
```tsx
<a
  href="#main-content"
  className="absolute left-4 top-4 z-[100] -translate-y-16 bg-accent px-4 py-2 text-label uppercase tracking-[0.08em] text-ink transition-transform focus:translate-y-0 focus:shadow-lg"
>
  Skip to content
</a>
```

Do not remove it — it is required for WCAG compliance.

---

#### CAN-2 — NotesPyramid: add a brief education line
**Effort:** Low

First-time fragrance buyers may not know what Top/Heart/Base notes mean. Add a single sentence above the note groups:

```tsx
<p className="text-small text-stone/60 mb-4">
  How a fragrance unfolds — opening, character, and the lasting dry-down.
</p>
```

---

## 2. Accessibility Checklist

| Check | Status | Fix Required |
|---|---|---|
| Skip-to-content present | ✅ Present | Adjust position (CAN-1) |
| All interactive elements have accessible labels | ✅ | — |
| Slide indicators have `aria-label` | ✅ | — |
| Cart button has item count in label | ✅ | — |
| `aria-hidden` on decorative elements | ✅ | — |
| Colour contrast — `text-stone` on `bg-ink` | ⚠️ `#8A7A60` on `#0A0A08` = 4.3:1 (passes AA, fails AAA) | Accept or darken |
| Colour contrast — `text-slate` on `bg-ink` | ❌ `#5C4E38` on `#0A0A08` = 2.4:1 — fails AA | Replace with `text-stone` on dark sections |
| Colour contrast — checkout form text | ❌ `text-ink` on `bg-ink` = 1:1 | Fix in MUST-1 |
| Focus ring: `focus-visible` outline set globally | ✅ `2px solid accent` | Update to `#E4B250` after token change |
| Form labels associated via `htmlFor`/`id` | ✅ | — |
| Required fields marked `required` | ✅ | — |
| Select dropdown has default empty option | ✅ | — |
| `main` landmark present (`id="main-content"`) | ✅ | — |
| Headings hierarchy (h1 → h2 → h3) | ✅ | — |
| Images have `alt` text | ✅ | — |
| WhatsApp FAB has `aria-label` | — | Required when FAB is added (SHOULD-3) |
| `prefers-reduced-motion` for slideshow | ❌ Missing | Pause auto-advance if `prefers-reduced-motion: reduce` |

**Add reduced-motion support to HeroSlideshow:**
```tsx
const prefersReduced = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

useEffect(() => {
  if (prefersReduced) return  // Don't auto-advance
  const id = setInterval(next, INTERVAL)
  return () => clearInterval(id)
}, [next, prefersReduced])
```

---

## 3. Concrete UI Specifications

### Colour tokens (updated)
```
accent (primary CTA): #E4B250   — CTAs, badges, FAB, progress, focus ring
gold   (decorative):  #E8D5A3   — watermarks, decorative borders (unchanged)
bone   (light text):  #F2E6C8   — text on dark (unchanged)
ink    (dark bg):     #0A0A08   — page bg, dark surfaces (unchanged)
mist   (alt surface): #1D1B16   — form inputs bg, section alternation (unchanged)
stone  (secondary):   #8A7A60   — secondary text, borders (unchanged)
```

### Typography (responsive rules to enforce)
| Element | Mobile | Tablet (sm) | Desktop (md+) |
|---|---|---|---|
| Hero h1 | 36px | 56px | 56px (reduce from 80px) |
| Section h2 | 28px | 36px | 36px |
| PDP h1 | 32px | — | 56px |
| Nav logo | 16px | 20px | 28px |
| Body | 16px | 16px | 16px |
| Label (caps) | 12px | 12px | 12px |

### WhatsApp FAB spec
- Size: 52×52 circle on desktop; expands to 52px tall pill with "Chat" label on mobile
- Background: `#E4B250`
- Icon: WhatsApp filled SVG, 20×20, `color: #0A0A08`
- Position: `fixed bottom-6 right-5 z-40`
- Hover: `scale(1.05)`
- Active: `scale(0.95)`
- Shadow: `shadow-lg`
- z-index: 40 (below cart drawer at 50, above page content)

---

## 4. Technical Checklist — Medusa Orders Not Appearing

Work through these in order. Each step either confirms the problem or rules it out.

### Step 1 — Verify Vercel environment variables
Check in **Vercel Dashboard → Project → Settings → Environment Variables** that ALL of these are set for **Production**:

| Variable | Expected value |
|---|---|
| `MEDUSA_ADMIN_EMAIL` | `hello@niran.cc` (or your admin email) |
| `MEDUSA_ADMIN_PASSWORD` | Your admin password |
| `NEXT_PUBLIC_MEDUSA_REGION_ID` | `reg_01KR1BJY9FY7BFMJS3TFHCYSP2` |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://impact-perfumes-medusa-production.up.railway.app` |
| `PAYSTACK_SECRET_KEY` | Must be `sk_live_...` (not test key) for live orders |

These four are in `.env.local` but `.env.local` is never deployed to Vercel. If they're missing in Vercel, `createMedusaOrder` silently returns early.

### Step 2 — Add server-side logging to createMedusaOrder
`createMedusaOrder` currently swallows every error silently. Add logging so you can see what's happening in Vercel Function logs:

```ts
async function createMedusaOrder(opts: {...}): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const regionId = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID
  
  if (!backendUrl || !regionId) {
    console.error('[createMedusaOrder] Missing env vars:', { backendUrl: !!backendUrl, regionId: !!regionId })
    return
  }

  const token = await getMedusaAdminToken()
  if (!token) {
    console.error('[createMedusaOrder] Failed to obtain admin token — check MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD')
    return
  }

  const res = await fetch(`${backendUrl}/admin/draft-orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  })
  
  if (!res.ok) {
    const text = await res.text()
    console.error('[createMedusaOrder] Draft order creation failed:', res.status, text)
  } else {
    console.log('[createMedusaOrder] Draft order created successfully')
  }
}
```

After deploying, place a test order. Then check **Vercel Dashboard → Project → Functions → /api/verify-payment** logs.

### Step 3 — Verify Medusa auth endpoint
The current auth call uses `/auth/user/emailpass`. Confirm this matches your Medusa version:

- **Medusa v1:** `POST /store/auth` or `POST /admin/auth`
- **Medusa v2:** `POST /auth/user/emailpass` ← current code — verify this matches Railway deployment

Test the auth endpoint directly:
```bash
curl -X POST https://impact-perfumes-medusa-production.up.railway.app/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"hello@niran.cc","password":"YOUR_PASSWORD"}'
```
Expected: `{"token": "eyJ..."}`. If you get 404 or 401, the endpoint path is wrong.

### Step 4 — Verify region ID
The region ID `reg_01KR1BJY9FY7BFMJS3TFHCYSP2` must exist in the Railway Medusa instance. Check in **Medusa Admin → Settings → Regions**. If the backend was redeployed from scratch, region IDs change.

### Step 5 — Check draft orders in Medusa Admin
If steps 1–4 are all correct, log into **Medusa Admin → Orders → Draft Orders**. Orders created via `/admin/draft-orders` appear here, not in the main Orders list. They need to be manually confirmed or you need to add a second API call to confirm them.

To auto-confirm after creation, add to `createMedusaOrder`:
```ts
const order = await res.json()
const draftId = order.draft_order?.id
if (draftId) {
  await fetch(`${backendUrl}/admin/draft-orders/${draftId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}
```

### Step 6 — Paystack test vs live key
The `.env.local` contains `sk_test_...`. Test transactions verify successfully but don't appear in your live Paystack dashboard. In production, `PAYSTACK_SECRET_KEY` must be `sk_live_...`. Verify this in Vercel env vars.

### Network call to inspect (browser DevTools)
When placing a test order, open DevTools → Network → filter to `verify-payment`. Inspect:
- **Request payload:** confirm `reference`, `amountKobo`, `lines` are all present
- **Response:** should be `{ ok: true, reference: "impact-..." }`
- If response is `{ ok: false, message: "..." }` — read the message

---

## 5. Rollout Approach

| Priority | Items | Approach |
|---|---|---|
| **Immediate (ship today)** | MUST-1 (checkout), MUST-2 (PDP colours), MUST-3 (Medusa env vars + logging) | Single hotfix commit |
| **This sprint** | SHOULD-1 (hero opacity), SHOULD-2 (hero text), SHOULD-3 (WhatsApp FAB), SHOULD-4 (brand colour) | One PR — no structural changes |
| **Next sprint** | SHOULD-5 (quiz), SHOULD-6 (notes data), CAN-1 (skip link), CAN-2 (notes edu copy) | Separate PR — test quiz conversion |

---

## 6. Follow-up Questions

1. **Brand colour:** Should `#E4B250` fully replace the current `#C9A96E` accent, or should both live in the palette (current as `gold-mid`, new as `accent`)? Replacing globally is lower effort; dual-token approach gives more design control.

2. **Medusa orders:** Are you expecting orders to appear as Draft Orders or confirmed Orders in the backend? The current implementation creates draft orders only.

3. **Hero images:** Do you have higher-resolution or better-lit versions of the hero images? Increasing opacity on dark/underexposed source images will just make them appear greyish rather than vivid. The image quality matters as much as the overlay setting.

4. **Checkout background:** Should the checkout page have a `bg-bone` (light) or `bg-mist` (dark) treatment? A light checkout is easier to read and more conventional for e-commerce; a dark checkout is consistent with the brand but requires careful colour management (which was the source of the bug).
