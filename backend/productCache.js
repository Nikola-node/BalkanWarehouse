import { getAllProducts, getColors } from './promobox.js';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MARKUP = 1.1;

let cachedProducts = [];
let cachedGroupedProducts = [];
let cachedColors = [];
let lastRefreshedAt = null;

export function applyMarkup(product) {
  const { Price2, ...rest } = product; // Price2 is Promobox's internal/wholesale price, never send it out
  return {
    ...rest,
    Price: Math.round(product.Price * MARKUP * 100) / 100,
  };
}

// Promobox lists one row per size/color variant (SKU). Customers should see
// one card per real product, so we group all variants sharing the same
// Model into a single entry with a min-max price range.
function groupByModel(products) {
  const groups = new Map();

  for (const p of products) {
    const key = p.Model || p.Name;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        model: key,
        name: p.Name,
        category: p.Category,
        subCategory: p.SubCategory,
        minPrice: p.Price,
        maxPrice: p.Price,
        variantIds: [p.Id],
      });
    } else {
      existing.minPrice = Math.min(existing.minPrice, p.Price);
      existing.maxPrice = Math.max(existing.maxPrice, p.Price);
      existing.variantIds.push(p.Id);
    }
  }

  return Array.from(groups.values());
}

export function getProducts() {
  return cachedProducts;
}

export function getGroupedProducts() {
  return cachedGroupedProducts;
}

// All SKUs sharing the same Model as the given product id (its size/color
// siblings), used to build the size/color picker on a product detail page.
export function getSiblings(id) {
  const product = cachedProducts.find((p) => p.Id === id);
  if (!product) {
    return [];
  }
  const key = product.Model || product.Name;
  return cachedProducts.filter((p) => (p.Model || p.Name) === key);
}

// Looks up a color code (e.g. "B - BL") in the Color codebook for its
// display name and swatch hex value.
export function getColorInfo(code) {
  return cachedColors.find((c) => c.Id === code) || null;
}

export async function refreshProducts() {
  try {
    const [raw, colors] = await Promise.all([getAllProducts(), getColors()]);
    cachedProducts = raw.map(applyMarkup);
    cachedGroupedProducts = groupByModel(cachedProducts);
    cachedColors = colors;
    lastRefreshedAt = new Date();
    console.log(
      `Product cache refreshed: ${cachedProducts.length} SKUs (${cachedGroupedProducts.length} products) at ${lastRefreshedAt.toISOString()}`,
    );
  } catch (err) {
    console.error('Product cache refresh failed, keeping previous data:', err.message);
  }
}

export function startProductCache() {
  setInterval(refreshProducts, REFRESH_INTERVAL_MS);
}
