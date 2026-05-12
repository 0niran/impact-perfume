# Impact Perfumes Product Seeding

This script seeds the Medusa backend with all 50 Number Series fragrances and creates matching Sanity enrichment documents.

## What it does

1. **Creates 50 Medusa products** from `data/products.seed.json`
   - Each product has proper handle (e.g., `no-1`, `no-2`)
   - Placeholder price of ₦50,000 for all fragrances
   - Proper tags and metadata

2. **Creates Sanity productEnrichment documents** for each fragrance
   - Number, descriptor, signature color, tagline
   - Fragrance note references (top, heart, base)
   - Category, mood, occasion mappings

3. **Creates fragranceNote documents** for all unique notes
   - Auto-infers note families (citrus, floral, woody, etc.)
   - Avoids duplicates

4. **Creates Discovery Set product**
   - Special product for sampling
   - Priced at ₦25,000

5. **Creates product line placeholders**
   - Impact Oils, Car Diffusers, Reed Diffusers
   - Draft status until ready to populate

## Prerequisites

1. **Medusa backend running** with admin API access
2. **Sanity project created** with proper schemas
3. **Environment variables configured**

## Environment Variables

Required in your `.env.local`:

```env
# Medusa
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-medusa.up.railway.app
MEDUSA_ADMIN_API_KEY=your-admin-api-key

# Sanity  
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=your-write-token
```

## Running the Script

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the seeding script**:
   ```bash
   npm run seed-products
   ```

3. **Monitor progress** - the script logs each step:
   ```
   🌟 Impact Perfumes Product Seeding Script
   ==========================================

   📦 Loaded 50 products from seed data

   1️⃣  Creating product line placeholders...
   ✅ Product line placeholders created

   2️⃣  Creating Discovery Set...
   ✅ Discovery Set created

   3️⃣  Creating Number Series products...
   Creating Medusa product: Impact No. 1
   Creating Sanity enrichment for: Impact No. 1
   ...
   ✅ All Number Series products created

   🎉 Product seeding completed successfully!
   ```

## After Seeding

1. **Check Medusa Admin** - all products should be visible
2. **Review Sanity Studio** - enrichment data should be populated
3. **Update prices** - change from ₦50,000 placeholder to real prices
4. **Add product images** - upload lifestyle/macro shots in Sanity
5. **Write product stories** - complete the editorial content

## Troubleshooting

**"API request failed"**: Check your Medusa backend URL and admin API key

**"Missing required environment variables"**: Ensure all env vars are set

**Sanity errors**: Verify your project ID and that the write token has proper permissions

**Duplicate products**: The script doesn't check for existing products - run on a clean Medusa instance

## Data Source

All product data comes from `data/products.seed.json`, which contains:
- 50 numbered fragrances with complete metadata
- Brand information and product line descriptions
- Canonical scent family taxonomy

This is the source of truth parsed from the official Impact catalogue PDF.