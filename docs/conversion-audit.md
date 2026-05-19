# Conversion audit · May 2026

Top 10 evidence-based e-commerce conversion drivers, scored against the current
state of the storefront. Each item lists why it matters, where the site stands
today, and the smallest useful next step.

Scoring legend: ✅ in good shape · 🟡 partial · 🔴 missing or weak.

---

## 1. Page speed and Core Web Vitals  ·  🟡

Google's own data: ~7% conversion drop per 100ms added on mobile. LCP under
2.5s, CLS under 0.1, INP under 200ms is the bar.

**Today**: bundle sizes look healthy (88 kB shared, 1–4 kB per page). No
Lighthouse / WebPageTest run has been done since the recent design overhaul.

**Smallest next step**: run Lighthouse mobile on `/`, `/shop`, a PDP, and
`/checkout` from production. Fix anything red. Likely wins are explicit
`sizes` attributes on the remaining `<Image>` usages and dropping unused
chunks.

---

## 2. Product imagery (multi-angle, zoom, video)  ·  🔴

PDPs with multiple angles + zoom convert ~20–40% better than single-shot
pages. Fragrance specifically benefits from bottle macro, label detail, and
lifestyle context shots.

**Today**: each PDP shows the same single bottle render (`no_series.png` /
`Oil_perfume.png`) centred on a dark luxe surface. No gallery, no zoom, no
video.

**Smallest next step**: extend each Medusa product to support an `images[]`
array (Medusa already supports this — just need uploaded photos). Build a
simple gallery with thumbnails + lightbox zoom. Photography is the
bottleneck, not code.

---

## 3. Reviews and social proof on the PDP  ·  🔴

5–25% conversion lift is the consistently-cited range for adding a reviews
block. For luxury, even a small number of high-quality reviews beats none.

**Today**: a `review` schema exists in Sanity (`src/sanity/schemas/review.ts`)
but no reviews are rendered anywhere. PDPs have no star rating, no review
count, no "12 happy customers" line.

**Smallest next step**: hook the Sanity `review` schema up to a `ReviewsBlock`
component on the PDP. Show average star, count, latest three reviews. Seed
with 5–10 real customer quotes from existing WhatsApp / Instagram messages
the owner already has.

---

## 4. Free-shipping threshold communication  ·  🟡

Baymard reports unexpected shipping cost is the #1 reason for cart abandonment
(60%+). A clear "free over $X" message at every stage lifts AOV.

**Today**: the header utility bar mentions "Free delivery on orders over
₦50,000" but the value is hard-coded to NGN. The cart drawer doesn't show a
progress bar, the PDP doesn't repeat the message.

**Smallest next step**:

- Make `freeDeliveryDisplay` region-aware (NG: ₦50,000, CA: $150 or
  whatever the owner sets).
- Add a thin progress bar to the cart drawer: "Add $X to unlock free
  shipping" → "🎉 You qualify for free shipping!"
- Mention the threshold on each PDP near the price.

---

## 5. Guest checkout  ·  ✅

23–37% of shoppers abandon when forced to create an account before buying.

**Today**: the Paystack and Stripe flows are both guest-only. No account is
ever requested. Good.

**Smallest next step**: no action. Maybe add a post-purchase opt-in "create
an account to track your order" but it's not blocking.

---

## 6. Streamlined checkout  ·  🟡

Each extra checkout step costs 10–30% completion. The benchmark is 1–3 form
fields visible at a time.

**Today**: Paystack flow is one page, lots of fields shown at once. Stripe
flow is 2 steps. Both functional but neither is best-in-class.

**Smallest next step**: shrink the Paystack form too — collapse the address
into a single 3-field block (street, city+state row, optional apartment).
Save the order summary as a sticky sidebar instead of below the form on
mobile. Add inline validation as the user types rather than only on submit.

---

## 7. Multiple payment methods (esp. Apple Pay / Google Pay)  ·  🟡

Mobile Apple Pay can lift mobile conversion 40%+ vs typing a card.

**Today**: NG has Paystack (cards, bank transfer, USSD — solid).
CA has Stripe Payment Element which auto-enables Apple Pay and Google Pay
when the browser supports them (no extra code needed). So the rails are
there — but Apple Pay isn't tested end-to-end yet, and Paystack doesn't
expose Apple Pay in Nigeria.

**Smallest next step**: visit the live Stripe checkout from Safari on
iPhone with Apple Pay set up — confirm the Apple Pay button renders. If
not, enable Apple Pay domain verification in Stripe Dashboard (Settings →
Apple Pay → add `impactperfumes.com`).

---

## 8. Mobile UX  ·  🟡

70%+ of fragrance e-com traffic is mobile. Sticky CTAs, thumb-reach
navigation, large tap targets matter.

**Today**: sticky Add-to-Cart bar on PDP mobile is built. WhatsApp FAB
exists. Header collapses on scroll. But the new 3-column shop grid and
the multi-section /home page haven't been QA'd on small screens since
the redesign.

**Smallest next step**: spend 30 min on an iPhone walking every key
route. Watch for: overflowing text, untappable buttons, broken sticky
elements, the region switcher behavior. Fix what you find.

---

## 9. Personalisation and recommendations  ·  🟡

"Recently viewed" + smart "you might also like" lifts AOV 5–15%.

**Today**: Fragrance Finder quiz exists (excellent — directly converts
indecisive visitors). `RelatedProducts` on PDP shows the two neighbouring
numbers, which is naive. No "recently viewed", no scent-family-based
recommendations.

**Smallest next step**: replace the neighbour-based related list with
"others in the same scent family" using the `scent_family` metadata we
already migrated. Add a "recently viewed" rail (4 tiles) at the bottom
of the cart drawer + PDP, sourced from a tiny `localStorage` ring buffer.

---

## 10. Abandoned cart recovery  ·  🔴

10–20% of abandoned carts are recoverable via timed email sequences. The
first email at 1h gets the highest reply rate; second at 24h with a soft
nudge; third at 72h optionally with a small incentive.

**Today**: the cart persists in `localStorage` (no email triggers). No
abandoned-cart flow exists.

**Smallest next step**: this needs (a) collecting email earlier in the
funnel — e.g. on PDP "notify me" or via a cart-drawer email field, then
(b) a scheduled job. Vercel doesn't run cron natively for free tier; a
small Resend Audiences + Vercel cron or Sanity webhook fan-out works.
Defer until the core fixes above are in.

---

## Honourable mentions (not in the top 10 but worth flagging)

- **Search quality**: a `SearchOverlay` exists. Search by descriptor /
  scent family / number all need to work. Worth a 15-min test.
- **Wishlist**: not built. Lower priority than reviews.
- **Newsletter capture on exit intent**: `NewsletterBlock` is on the
  homepage only. Could add a one-time exit-intent popup with a discovery
  set offer.
- **Stock scarcity**: deliberately avoid for luxury — use "limited
  edition" framing instead.
- **Loyalty / referrals**: not built. Worth considering after the funnel
  fixes above land.

---

## Recommended sequence

Strict order of impact-per-effort for the next 4 sprints:

1. **Sprint 1 (this week)**: items 4 (free-shipping bar) + 8 (mobile QA) +
   7 (verify Apple Pay) — all under a day's work, all measurable wins.

2. **Sprint 2**: item 3 (reviews block) + item 9 (recently-viewed +
   scent-family recommendations). Needs ~5 real reviews from the owner.

3. **Sprint 3**: item 2 (PDP image gallery) once photography is in hand.
   Without real photos this is wasted effort — current renders look
   the same from every angle.

4. **Sprint 4**: item 1 (Lighthouse pass) + item 10 (abandoned cart
   recovery, which is a multi-day build).
