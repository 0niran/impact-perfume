# Durable product images: Medusa → Cloudflare R2

## Why

Medusa (on Railway) writes admin image uploads to its **own container
filesystem** (`/static/...`). Railway's filesystem is **ephemeral** — it is
wiped on every redeploy — so uploaded product images 404 after the next deploy.
The storefront currently papers over this for six named products with a
hardcoded map (`LOCAL_PRODUCT_IMAGES` in `src/lib/medusa.ts`); every other
product loses its image on redeploy. This is the root cause of the "~100/129
products missing images" finding.

The fix is to point Medusa's file provider at **Cloudflare R2** (S3-compatible,
durable, no egress fees) so uploads persist across redeploys.

## The change has three surfaces

| Surface | Where | Does what |
|---|---|---|
| 1. File-provider config | Medusa repo (`medusa-config.ts`) | Makes Medusa **upload** to R2 |
| 2. R2 credentials | **Railway** env (Medusa service) | Auth for the upload |
| 3. Image host allowlist | **Vercel** env (storefront) | Lets `next/image` **display** R2 URLs |

Surface 3 alone (a Vercel env var) does **nothing** on its own — the storefront
keeps 404ing until surfaces 1 + 2 are live and Medusa is actually writing to R2.

---

## 1. Cloudflare R2 (one-time)

1. Bucket is created (done).
2. Create an **R2 API token** (R2 → Manage API Tokens → Object Read & Write) —
   yields an **Access Key ID** and **Secret Access Key**. Treat as secrets.
3. Decide the **public host** for serving images:
   - **Recommended:** a custom domain mapped to the bucket (R2 → the bucket →
     Settings → Public access → Custom Domain, e.g. `files.impactperfumes.com`).
   - The managed `https://<bucket>.<account-id>.r2.dev` URL also works but is
     rate-limited and not meant for production traffic.
4. Note your **account ID** — the S3 endpoint is
   `https://<account-id>.r2.cloudflarestorage.com`.

## 2. Railway env vars (Medusa service)

Set these on the Medusa service, then redeploy. Values in `< >` are yours; the
two keys are **secrets** — never commit them.

```
S3_FILE_URL          = https://files.impactperfumes.com        # public host, WITH https://
S3_ENDPOINT          = https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET            = <bucket-name>
S3_REGION            = auto                                     # R2 ignores region; "auto" is fine
S3_ACCESS_KEY_ID     = <r2 access key id>                      # secret
S3_SECRET_ACCESS_KEY = <r2 secret access key>                  # secret
S3_PREFIX            =                                          # optional, e.g. "medusa/"
```

## 3. medusa-config.ts (Medusa repo)

Add the File Module with the built-in S3 provider. `@medusajs/medusa` already
ships it — no extra dependency. `forcePathStyle: true` is **required** for R2.

```ts
import { Modules } from "@medusajs/framework/utils"

module.exports = {
  modules: [
    // ...existing modules...
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              prefix: process.env.S3_PREFIX,
              cache_control: "public, max-age=31536000",
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
  ],
}
```

Redeploy Medusa. If a local file module was configured before, this replaces it.

## 4. Vercel env var (storefront) — mind the format

Set on the storefront (Production, and Preview if you want parity):

```
NEXT_PUBLIC_MEDUSA_IMAGE_HOST = files.impactperfumes.com
```

> **Gotcha:** this must be the **bare hostname** — no `https://`, no path,
> no trailing slash. `next.config.mjs` uses it as the `hostname` of a
> `remotePatterns` entry (`{ protocol: "https", hostname: mediaHost }`). If you
> include the scheme (`https://files...`) the pattern never matches and every
> R2 image is blocked by `next/image` with no obvious error. So: `S3_FILE_URL`
> keeps the `https://`, `NEXT_PUBLIC_MEDUSA_IMAGE_HOST` does not.

Redeploy the storefront so the new `remotePatterns` entry is baked into the build.

## 5. Migrate existing images

Images that were on the old ephemeral disk are already gone. New uploads land in
R2 automatically once the above is live. To restore the catalogue:

- Re-upload product images through the Medusa admin (they now persist), **or**
- run `npm run` image backfill tooling if the source assets are in the repo
  (`scripts/backfill-product-images.ts`).

## 6. Verify

1. Upload a test image in Medusa admin → confirm its URL is
   `https://files.impactperfumes.com/...` (your public host), not a Railway
   `/static/...` path.
2. Trigger a Railway redeploy → the image still loads (this is the whole point).
3. Confirm it renders on the storefront (no `next/image` host error in the
   browser console / Vercel logs).

## 7. Storefront cleanup (follow-up, only after 1–6 verified)

Once R2 durably serves images **and** the six named products are re-uploaded,
the hardcoded `LOCAL_PRODUCT_IMAGES` map in `src/lib/medusa.ts` can be removed.
Keep `normaliseImageUrl()` — it still rewrites `localhost:9000` image origins
for **local dev** and is harmless in production. That deletion is a small,
verifiable PR on its own; do not remove the map before the R2 images are proven,
or those six products lose their images.
