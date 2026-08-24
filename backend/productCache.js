import { getAllProducts } from './promobox.js';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MARKUP = 1.1;

let cachedProducts = [];
let cachedGroupedProducts = [];
let lastRefreshedAt = null;

function applyMarkup(product) {
  return {
    ...product,
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

export async function refreshProducts() {
  try {
    const raw = await getAllProducts();
    cachedProducts = raw.map(applyMarkup);
    cachedGroupedProducts = groupByModel(cachedProducts);
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
