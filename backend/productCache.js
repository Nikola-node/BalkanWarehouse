import { getAllProducts, getColors, getModels, getProductStock } from './promobox.js';
import { classify, getTree, getUnmappedCombos, resetUnmappedCombos } from './categoryTree.js';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MARKUP = 1.1;

let cachedProducts = [];
let cachedGroupedProducts = [];
let cachedColors = [];
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
        return { id: node.id, name: node.name, count: counts.get(node.id) || 0, children };
      })
      .filter((node) => node.count > 0);
  }

  return build(getTree());
}

export function getProducts() {
  return cachedProducts;
}

// Lets a search for "solja" find "šolja" - customers won't reliably type
// Serbian diacritics, so both sides are folded to plain ASCII before matching.
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/š/g, 's')
    .replace(/đ/g, 'dj')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/ž/g, 'z');
}

export function getGroupedProducts({ nodeId, q } = {}) {
  let products = cachedGroupedProducts;

  if (nodeId) {
    const nodePath = nodeId.split('/');
    products = products.filter((p) => nodePath.every((segment, i) => p.categoryPath[i] === segment));
  }

  if (q) {
    const needle = normalize(q.trim());
    products = products.filter((p) => normalize(p.name).includes(needle));
  }

  return products;
}

export function getCategoryTree() {
  return cachedCategoryTree;
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
    const [raw, colors, models, stock] = await Promise.all([
      getAllProducts(),
      getColors(),
      getModels(),
      getProductStock(),
    ]);
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
    const stockByProduct = new Map();
    for (const row of stock) {
      stockByProduct.set(row.ProductId, (stockByProduct.get(row.ProductId) || 0) + row.Qty);
    }
    const colorInfo = new Map(colors.map((c) => [c.Id, c]));

    cachedProducts = raw.map(applyMarkup);
    cachedGroupedProducts = groupByModel(cachedProducts, modelInfo, stockByProduct, colorInfo);
    cachedColors = colors;
    cachedCategoryTree = buildCategoryTree(cachedGroupedProducts);

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
      `Product cache refreshed: ${cachedProducts.length} SKUs (${cachedGroupedProducts.length} products) at ${lastRefreshedAt.toISOString()}`,
    );
  } catch (err) {
    console.error('Product cache refresh failed, keeping previous data:', err.message);
  }
}

export function startProductCache() {
  setInterval(refreshProducts, REFRESH_INTERVAL_MS);
}
