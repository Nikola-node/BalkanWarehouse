import { getAllProducts } from './promobox.js';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let cachedProducts = [];
let lastRefreshedAt = null;

export function getProducts() {
  return cachedProducts;
}

export async function refreshProducts() {
  try {
    cachedProducts = await getAllProducts();
    lastRefreshedAt = new Date();
    console.log(`Product cache refreshed: ${cachedProducts.length} products at ${lastRefreshedAt.toISOString()}`);
  } catch (err) {
    console.error('Product cache refresh failed, keeping previous data:', err.message);
  }
}

export function startProductCache() {
  setInterval(refreshProducts, REFRESH_INTERVAL_MS);
}
