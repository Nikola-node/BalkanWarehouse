import { getAllProducts, getColors, getModels, getProductStock, getShades } from './promobox.js';
import { classify, getTree, getUnmappedCombos, resetUnmappedCombos } from './categoryTree.js';

const LANGS = ['sr', 'en'];
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MARKUP = 1.1;

let cachedProducts = { sr: [], en: [] };
let cachedGroupedProducts = { sr: [], en: [] };
let cachedColors = { sr: [], en: [] };
let cachedShades = { sr: [], en: [] };
let cachedCategoryTree = [];
let cachedStockByProduct = new Map();
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
// Model into a single entry with a min-max price range, every color offered,
// and total stock across all of them. `modelInfo` maps a Model name to its
// image/description/GroupWeb data (from /api/Model), `stockByProduct` maps a
// SKU id to its total stock across warehouses (from /api/ProductStock), and
// `colorInfo` maps a color code to its display name and swatch hex (from
// /api/Color) - none of this lives on the /api/Product list itself.
function groupByModel(products, modelInfo, stockByProduct, colorInfo) {
  const groups = new Map();

  for (const p of products) {
    const key = p.Model || p.Name;
    const existing = groups.get(key);
    const stockQty = stockByProduct.get(p.Id) || 0;

    if (!existing) {
      const info = modelInfo.get(key);
      const group = {
        model: key,
        name: p.Name,
        code: info?.code || null,
        description: info?.description || null,
        minPrice: p.Price,
        maxPrice: p.Price,
        variantIds: [p.Id],
        image: info?.image || null,
        imageHover: info?.imageHover || null,
        stockQty,
        colorCodes: new Set(p.Color ? [p.Color] : []),
        createdAt: p.Created,
      };
      group.categoryPath = classify({
        groupWeb1: info?.groupWeb1,
        groupWeb2: info?.groupWeb2,
        groupWeb3: info?.groupWeb3,
      });
      groups.set(key, group);
    } else {
      existing.minPrice = Math.min(existing.minPrice, p.Price);
      existing.maxPrice = Math.max(existing.maxPrice, p.Price);
      existing.variantIds.push(p.Id);
      existing.stockQty += stockQty;
      if (p.Color) existing.colorCodes.add(p.Color);
      if (p.Created < existing.createdAt) existing.createdAt = p.Created;
    }
  }

  return Array.from(groups.values()).map((group) => {
    const { colorCodes, ...rest } = group;
    const colors = [...colorCodes]
      .map((code) => colorInfo.get(code))
      .filter(Boolean)
      .map((c) => ({ id: c.Id, name: c.Name, htmlColor: c.HtmlColor }));
    return { ...rest, colors, inStock: rest.stockQty > 0 };
  });
}

// Each grouped product carries a `categoryPath` from classify() - the id
// path (e.g. ['tekstil','majice','unisex-majice']) of the deepest tree node
// it could be matched to. This walks the static tree and attaches a product
// count to every node by counting products whose categoryPath starts with
// that node's own path - so a main category's count includes products only
// classified that shallowly, plus everything under its subcategories. Nodes
// with no products are dropped so the menu never shows a dead-end filter.
// Counts are language-independent (same products either way), so this is
// built once from the Serbian grouped list and carries both name/nameEn.
function buildCategoryTree(groupedProducts) {
  const counts = new Map();
  for (const p of groupedProducts) {
    for (let depth = 1; depth <= p.categoryPath.length; depth++) {
      const id = p.categoryPath.slice(0, depth).join('/');
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  function build(nodes) {
    return nodes
      .map((node) => {
        const children = node.children ? build(node.children) : undefined;
        return { id: node.id, name: node.name, nameEn: node.nameEn, count: counts.get(node.id) || 0, children };
      })
      .filter((node) => node.count > 0);
  }

  return build(getTree());
}

export function getProducts(lang = 'sr') {
  return cachedProducts[lang];
}

// Lets a search for "solja" find "šolja" - customers won't reliably type
// Serbian diacritics, so both sides are folded to plain ASCII before matching.
// A no-op for English text, which never has these characters anyway.
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/š/g, 's')
    .replace(/đ/g, 'dj')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/ž/g, 'z');
}

const SORTERS = {
  date_desc: (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0),
  date_asc: (a, b) => (a.createdAt > b.createdAt ? 1 : a.createdAt < b.createdAt ? -1 : 0),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
  price_asc: (a, b) => a.minPrice - b.minPrice,
  price_desc: (a, b) => b.minPrice - a.minPrice,
  stock_asc: (a, b) => a.stockQty - b.stockQty,
  stock_desc: (a, b) => b.stockQty - a.stockQty,
};

function applyBaseFilters(products, { nodeId, q, minPrice, maxPrice, inStock } = {}) {
  if (nodeId) {
    const nodePath = nodeId.split('/');
    products = products.filter((p) => nodePath.every((segment, i) => p.categoryPath[i] === segment));
  }

  if (q) {
    const needle = normalize(q.trim());
    products = products.filter((p) => normalize(p.name).includes(needle));
  }

  // A product has a price range (different variants can cost different
  // amounts), so it matches a min/max filter if that range overlaps the
  // filter's range at all - not just if its starting price falls inside it.
  if (minPrice != null) {
    products = products.filter((p) => p.maxPrice >= minPrice);
  }
  if (maxPrice != null) {
    products = products.filter((p) => p.minPrice <= maxPrice);
  }

  if (inStock) {
    products = products.filter((p) => p.inStock);
  }

  return products;
}

export function getGroupedProducts({ lang = 'sr', nodeId, q, minPrice, maxPrice, inStock, sort } = {}) {
  const products = applyBaseFilters(cachedGroupedProducts[lang], { nodeId, q, minPrice, maxPrice, inStock });

  const sorter = SORTERS[sort] || SORTERS.date_desc;
  return [...products].sort(sorter);
}

export function getCategoryTree() {
  return cachedCategoryTree;
}

// The newest products overall tend to cluster in whichever category
// Promobox last uploaded a batch to (e.g. a run of new pens), which makes a
// poor "what's new" homepage row. This instead takes the newest few products
// from each main category and interleaves them round-robin, so the row
// actually spans different kinds of products.
export function getDiverseNewest({ lang = 'sr', limit = 16 } = {}) {
  const mains = cachedCategoryTree;
  if (mains.length === 0) return [];

  const perCategory = Math.max(1, Math.ceil(limit / mains.length));
  const byCategory = mains.map((main) => {
    const products = applyBaseFilters(cachedGroupedProducts[lang], { nodeId: main.id });
    return [...products].sort(SORTERS.date_desc).slice(0, perCategory);
  });

  const result = [];
  for (let i = 0; i < perCategory && result.length < limit; i++) {
    for (const list of byCategory) {
      if (list[i]) result.push(list[i]);
      if (result.length >= limit) break;
    }
  }
  return result;
}

// Small, ranked set of products for search-as-you-type suggestions - matches
// whose name starts with the typed text are shown before ones that merely
// contain it, so typing "sol" surfaces "Solja ..." before "Kesica za solju".
export function getSuggestions({ lang = 'sr', q, limit = 6 } = {}) {
  const needle = normalize((q || '').trim());
  if (!needle) return [];

  const matches = applyBaseFilters(cachedGroupedProducts[lang], { q });
  const ranked = [...matches].sort((a, b) => {
    const aStarts = normalize(a.name).startsWith(needle) ? 0 : 1;
    const bStarts = normalize(b.name).startsWith(needle) ? 0 : 1;
    return aStarts !== bStarts ? aStarts - bStarts : a.name.localeCompare(b.name);
  });

  return ranked.slice(0, limit).map((p) => ({
    variantIds: p.variantIds,
    model: p.model,
    name: p.name,
    image: p.image,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
  }));
}

// Other products from the same (deepest) category as the given SKU, for a
// "similar products" section on the product detail page - the newest ones
// first, excluding the product itself.
export function getSimilarProducts({ id, lang = 'sr', limit = 8 } = {}) {
  const sku = cachedProducts[lang].find((p) => p.Id === id);
  if (!sku) return [];

  const key = sku.Model || sku.Name;
  const current = cachedGroupedProducts[lang].find((p) => p.model === key);
  if (!current || current.categoryPath.length === 0) return [];

  const nodeId = current.categoryPath.join('/');
  const candidates = applyBaseFilters(cachedGroupedProducts[lang], { nodeId }).filter(
    (p) => p.model !== key,
  );

  return [...candidates].sort(SORTERS.date_desc).slice(0, limit);
}

// All SKUs sharing the same Model as the given product id (its size/color
// siblings), used to build the size/color picker on a product detail page.
export function getSiblings(id, lang = 'sr') {
  const products = cachedProducts[lang];
  const product = products.find((p) => p.Id === id);
  if (!product) {
    return [];
  }
  const key = product.Model || product.Name;
  return products.filter((p) => (p.Model || p.Name) === key);
}

// Looks up a color code (e.g. "B - BL") in the Color codebook for its
// display name and swatch hex value.
export function getColorInfo(code, lang = 'sr') {
  return cachedColors[lang].find((c) => c.Id === code) || null;
}

// Looks up a Shade code (e.g. "23") for its specific display name and swatch
// hex value - unlike getColorInfo, this distinguishes shades that share the
// same broader Color family (e.g. "Plava" vs "Rojal plava").
export function getShadeInfo(code, lang = 'sr') {
  return cachedShades[lang].find((s) => s.Id === code) || null;
}

// Total stock across warehouses for one SKU, keyed the same way as
// /api/ProductStock's ProductId - used to show each color variant's own
// stock level on the product page, not just the whole model's total.
export function getStockQty(id) {
  return cachedStockByProduct.get(id) || 0;
}

export async function refreshProducts() {
  try {
    const fetched = {};
    await Promise.all(
      LANGS.map(async (lang) => {
        const [raw, colors, models, shades] = await Promise.all([
          getAllProducts(lang),
          getColors(lang),
          getModels(lang),
          getShades(lang),
        ]);
        fetched[lang] = { raw, colors, models, shades };
      }),
    );
    const stock = await getProductStock();

    const stockByProduct = new Map();
    for (const row of stock) {
      stockByProduct.set(row.ProductId, (stockByProduct.get(row.ProductId) || 0) + row.Qty);
    }
    cachedStockByProduct = stockByProduct;

    for (const lang of LANGS) {
      const { raw, colors, models, shades } = fetched[lang];
      const modelInfo = new Map(
        models.map((m) => [
          m.Name,
          {
            image: m.Image,
            imageHover: m.ImageHover?.trim() || null,
            code: `${m.Id.slice(0, 2)}.${m.Id.slice(2)}`,
            description: m.Description,
            groupWeb1: m.GroupWeb1,
            groupWeb2: m.GroupWeb2,
            groupWeb3: m.GroupWeb3,
          },
        ]),
      );
      const colorInfo = new Map(colors.map((c) => [c.Id, c]));

      // Sorted by Id so the "first" SKU encountered per model in
      // groupByModel - which becomes that group's representative name and
      // description - is the same physical variant in both languages. Without
      // this, two separate API calls (one per culture) can return their rows
      // in different order, making the same product show e.g. a blue variant's
      // name in Serbian but a black variant's name in English.
      cachedProducts[lang] = raw.map(applyMarkup).sort((a, b) => a.Id.localeCompare(b.Id));
      cachedGroupedProducts[lang] = groupByModel(cachedProducts[lang], modelInfo, stockByProduct, colorInfo);
      cachedColors[lang] = colors;
      cachedShades[lang] = shades;
    }

    cachedCategoryTree = buildCategoryTree(cachedGroupedProducts.sr);

    const unmapped = getUnmappedCombos();
    if (unmapped.length > 0) {
      console.warn(`${unmapped.length} unmapped GroupWeb combo(s) - add these to categoryTree.js's GROUPWEB_LEAF:`);
      for (const { combo, count, fallback } of unmapped) {
        console.warn(`  ${combo} (${count} product${count === 1 ? '' : 's'}) -> falling back to ${fallback ?? '(uncategorized)'}`);
      }
    }
    resetUnmappedCombos();

    lastRefreshedAt = new Date();
    console.log(
      `Product cache refreshed: ${cachedProducts.sr.length} SKUs (${cachedGroupedProducts.sr.length} products) at ${lastRefreshedAt.toISOString()}`,
    );
  } catch (err) {
    console.error('Product cache refresh failed, keeping previous data:', err.message);
  }
}

export function startProductCache() {
  setInterval(refreshProducts, REFRESH_INTERVAL_MS);
}
