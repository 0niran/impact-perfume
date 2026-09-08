#!/usr/bin/env tsx
/**
 * Fit a product photo to the house canvas.
 *
 *   npm run image -- <file-or-folder> [--out=dir]
 *
 * Why this exists: the storefront draws every product image with
 * `object-contain` inside a 4:5 frame. object-contain never crops and never
 * distorts — the right choice for a product photo — but it only fills the frame
 * when the image's own ratio matches. The catalogue's images run from 0.56 to
 * 1.75, a three-fold spread, so a square photo sits letterboxed inside a 4:5
 * tile and reads as "too small" no matter what the CSS does.
 *
 * No amount of CSS fixes that. The fix is to make the images the same shape
 * before they are uploaded:
 *
 *   1. Trim the flat border most product shots carry, so the bottle itself
 *      sets the bounds rather than the photographer's whitespace.
 *   2. Fit the result inside a 4:5 canvas at a fixed margin.
 *   3. Emit transparent PNG, so the tile's signature-colour glow shows through
 *      instead of a white rectangle sitting on the dark ground.
 *
 * The output drops straight into Medusa admin. Nothing here touches Medusa or
 * the live catalogue — it reads and writes local files only.
 */
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs/promises'

/** 4:5, matching the tile, the PDP panel and the cart thumbnail. */
const CANVAS = { width: 1600, height: 2000 }

/** Breathing room, as a fraction of the canvas. Keeps bottles off the edge. */
const MARGIN = 0.08

function flag(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

if (process.argv.includes('--help') || process.argv.length < 3) {
  console.log(`
Fit product photos to the house 4:5 canvas.

  npm run image -- product.png              writes product.canvas.png beside it
  npm run image -- ./photos --out=./ready   whole folder
  npm run image -- product.png --keep-bg    skip the transparency step

What it does: trims the flat border, fits the product inside a ${CANVAS.width}x${CANVAS.height}
canvas with an ${Math.round(MARGIN * 100)}% margin, writes a transparent PNG.

Upload the result in Medusa admin. Nothing is uploaded for you.
`)
  process.exit(0)
}

const KEEP_BG = process.argv.includes('--keep-bg')

async function normalise(file: string, outDir?: string): Promise<string> {
  const src = sharp(file)
  const before = await src.metadata()

  const inner = {
    width: Math.round(CANVAS.width * (1 - MARGIN * 2)),
    height: Math.round(CANVAS.height * (1 - MARGIN * 2)),
  }

  // trim() removes a uniform border using the top-left pixel as the reference.
  // It throws on an image that is entirely one colour, which is not worth
  // failing the run over — fall back to the untrimmed original.
  let body = sharp(file).ensureAlpha()
  try {
    body = body.trim({ threshold: 12 })
    await body.clone().toBuffer()
  } catch {
    body = sharp(file).ensureAlpha()
  }

  const fitted = await body
    .resize({ ...inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  const out = sharp({
    create: {
      ...CANVAS,
      channels: 4,
      background: KEEP_BG ? { r: 10, g: 10, b: 8, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9 })

  const base = path.basename(file).replace(/\.[^.]+$/, '')
  const dest = path.join(outDir ?? path.dirname(file), `${base}.canvas.png`)
  await out.toFile(dest)

  const ratioBefore = before.width && before.height ? (before.width / before.height).toFixed(2) : '?'
  console.log(
    `  ${path.basename(file)}  ${before.width}x${before.height} (${ratioBefore})  ->  ` +
      `${CANVAS.width}x${CANVAS.height} (0.80)`
  )
  return dest
}

async function main() {
  const target = process.argv[2]
  const outDir = flag('out')
  if (outDir) await fs.mkdir(outDir, { recursive: true })

  const stat = await fs.stat(target)
  const files = stat.isDirectory()
    ? (await fs.readdir(target))
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !f.includes('.canvas.'))
        .map((f) => path.join(target, f))
    : [target]

  if (files.length === 0) {
    console.log('No images found.')
    return
  }

  console.log(`\nFitting ${files.length} image(s) to ${CANVAS.width}x${CANVAS.height} (4:5)\n`)
  for (const f of files) {
    try {
      await normalise(f, outDir)
    } catch (err) {
      console.error(`  FAILED ${path.basename(f)}: ${err instanceof Error ? err.message : err}`)
    }
  }
  console.log('\nUpload the .canvas.png files in Medusa admin.\n')
}

main().catch((err) => {
  console.error('\nfailed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
