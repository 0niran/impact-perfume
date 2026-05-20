# Medusa → storefront auto-revalidation

When you edit a product in Medusa admin (price, image, description,
metadata), the storefront PDP can take up to an hour to reflect the
change because pages are cached with `revalidate = 3600`. This wires
Medusa to POST a tiny event to the storefront whenever a product
changes, and the storefront flushes the right paths immediately.

Two halves:

- **Storefront**: `POST /api/webhooks/medusa` (already deployed)
  receives the event and calls `revalidatePath()` for affected pages.
- **Medusa**: a subscriber in your Medusa repo listens for product
  events and fires the POST. **This is the half you need to add.**

---

## 1. Set the shared secret

Pick any random string (e.g. `openssl rand -hex 32`).

**On Vercel** → Project Settings → Environment Variables:
```
MEDUSA_WEBHOOK_SECRET=<that string>
```
(Optional — if you don't set it, the storefront falls back to
`CRON_SECRET`.)

**On Railway** → your Medusa project → Variables:
```
STOREFRONT_WEBHOOK_URL=https://impactperfumes.com/api/webhooks/medusa
STOREFRONT_WEBHOOK_SECRET=<same string>
```

## 2. Add the subscriber to your Medusa repo

Create `src/subscribers/storefront-revalidate.ts` in the Medusa repo:

```ts
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

type ProductEvent = {
  id: string
}

export default async function storefrontRevalidate({
  event: { data, name },
  container,
}: SubscriberArgs<ProductEvent>) {
  const url = process.env.STOREFRONT_WEBHOOK_URL
  const secret = process.env.STOREFRONT_WEBHOOK_SECRET
  if (!url || !secret) {
    return // not configured
  }

  const productModule = container.resolve(Modules.PRODUCT)

  let handle: string | undefined
  let categories: string[] = []
  try {
    const product = await productModule.retrieveProduct(data.id, {
      relations: ['categories'],
    })
    handle = product.handle
    categories = (product.categories ?? []).map((c) => c.handle).filter(Boolean)
  } catch {
    // Product may have been deleted — fall back to the id alone; the
    // storefront will skip if no handle.
  }

  if (!handle) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        type: name,
        data: { id: data.id, handle, categories },
      }),
    })
  } catch (err) {
    // Log but don't throw — a flaky storefront shouldn't break the admin save.
    console.error('[storefront-revalidate] webhook failed:', err)
  }
}

export const config: SubscriberConfig = {
  event: ['product.created', 'product.updated', 'product.deleted'],
}
```

That's it. Restart / redeploy Medusa.

## 3. Verify

In Medusa admin, edit any product (change the description or any field)
and save. Within ~5 seconds the corresponding storefront PDP should
show the new value on first reload — no 1-hour wait.

If it doesn't:

- **Check Medusa logs** for `[storefront-revalidate] webhook failed`.
- **Check Vercel function logs** for `/api/webhooks/medusa`. A 401
  means the secret doesn't match between Railway and Vercel.
- **Sanity-check the URL**: it should be your production storefront,
  not `localhost`.

## What gets revalidated

The receiver maps the product to paths conservatively:

| Product handle / category | Paths flushed |
|---|---|
| `no-{N}` | `/no/{N}`, `/shop`, `/` |
| `oil-no-{N}` | `/oil/{N}`, `/oils`, `/` |
| in category `signature` | `/signature/{handle}`, `/signature`, `/` |
| in category `gifts` or `discovery` | `/gifts`, `/` |
| in category `home-diffusers` / `scent-candles` / `scenting-machines` / `car-diffusers` | `/home`, `/` |

Over-invalidating is cheap (Next.js just regenerates on next visit);
under-invalidating is the bug we're avoiding.

## Manual override

If something gets wedged you can always trigger a path flush by hand:

```
curl "https://impactperfumes.com/api/revalidate?path=/no/1" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Repeatable `?path=` for multiple paths.
