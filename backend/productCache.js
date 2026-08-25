import { getAllProducts, getColors, getModels, getProductStock } from './promobox.js';
import { classify, getTree, getUnmappedCombos, resetUnmappedCombos } from './categoryTree.js';
import { TECHNIQUES, extractTechniques, getUnmatchedPhrases, resetUnmatchedPhrases } from './printTechnique.js';

const LANGS = ['sr', 'en'];
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MARKUP = 1.1;

let cachedProducts = { sr: [], en: [] };
let cachedGroupedProducts = { sr: [], en: [] };
let cachedColors = { sr: [], en: [] };
let cachedCategoryTree = [];
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
        printTechniques: info?.techniques || [],
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

// The filters everything but the print-technique checklist shares - both the
// product list and the technique facet counts (how many results *each*
// technique option would leave) are built from this same filtered set.
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

export function getGroupedProducts({ lang = 'sr', nodeId, q, minPrice, maxPrice, inStock, technique, sort } = {}) {
  let products = applyBaseFilters(cachedGroupedProducts[lang], { nodeId, q, minPrice, maxPrice, inStock });

  if (technique && technique.length > 0) {
    products = products.filter((p) => p.printTechniques.some((t) => technique.includes(t)));
  }

  const sorter = SORTERS[sort] || SORTERS.date_desc;
  return [...products].sort(sorter);
}

// Counts are computed from every filter except the technique checklist
// itself, so checking one technique box doesn't shrink the counts next to
// the others - matching how faceted filters normally behave.
export function getTechniqueFacets({ lang = 'sr', nodeId, q, minPrice, maxPrice, inStock } = {}) {
  const products = applyBaseFilters(cachedGroupedProducts[lang], { nodeId, q, minPrice, maxPrice, inStock });

  const counts = new Map();
  for (const p of products) {
    for (const id of p.printTechniques) counts.set(id, (counts.get(id) || 0) + 1);
  }

  return TECHNIQUES.filter((t) => counts.get(t.id) > 0).map((t) => ({
    id: t.id,
    name: lang === 'en' ? t.nameEn : t.name,
    count: counts.get(t.id),
  }));
}

export function getCategoryTree() {
  return cachedCategoryTree;
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

export async function refreshProducts() {
  try {
    const fetched = {};
    await Promise.all(
      LANGS.map(async (lang) => {
        const [raw, colors, models] = await Promise.all([getAllProducts(lang), getColors(lang), getModels(lang)]);
        fetched[lang] = { raw, colors, models };
      }),
    );
    const stock = await getProductStock();

    // Print-technique extraction only understands Serbian phrasing (see
    // printTechnique.js), so it always runs against the Serbian model text
    // and that result is reused for both languages - a product's set of
    // techniques doesn't change with the UI language.
    const techniquesByModelId = new Map(
      fetched.sr.models.map((m) => [m.Id, extractTechniques(m.ExtDescr)]),
    );

    const stockByProduct = new Map();
    for (const row of stock) {
      stockByProduct.set(row.ProductId, (stockByProduct.get(row.ProductId) || 0) + row.Qty);
    }

    for (const lang of LANGS) {
      const { raw, colors, models } = fetched[lang];
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
            techniques: techniquesByModelId.get(m.Id) || [],
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

    const unmatched = getUnmatchedPhrases();
    if (unmatched.length > 0) {
      console.warn(`${unmatched.length} unrecognized print-technique phrase(s) - add these to printTechnique.js's MATCHERS if they're real techniques:`);
      for (const { phrase, count } of unmatched) {
        console.warn(`  "${phrase}" (${count} model${count === 1 ? '' : 's'})`);
      }
    }
    resetUnmatchedPhrases();

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
