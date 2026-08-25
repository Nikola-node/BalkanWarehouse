import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getGroupedProducts, getTechniqueFacets, getCategoryTree, getSiblings, getColorInfo, applyMarkup, refreshProducts, startProductCache } from './productCache.js';
import { getProductDetail } from './promobox.js';
import { getNode } from './categoryTree.js';
import { generateOrderNumber, sendOrderEmails } from './email.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/categories', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const localize = (nodes) =>
    nodes.map((n) => ({ ...n, name: lang === 'en' ? n.nameEn : n.name, children: n.children && localize(n.children) }));
  res.json(localize(getCategoryTree()));
});

app.get('/api/products', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const nodeId = req.query.nodeId || undefined;
  const q = req.query.q || undefined;
  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
  const inStock = req.query.inStock === '1';
  const technique = req.query.technique ? req.query.technique.split(',').filter(Boolean) : undefined;
  const sort = req.query.sort || undefined;

  const all = getGroupedProducts({ lang, nodeId, q, minPrice, maxPrice, inStock, technique, sort });
  const techniqueFacets = getTechniqueFacets({ lang, nodeId, q, minPrice, maxPrice, inStock });

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 24);

  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  let filter = null;
  if (q) {
    filter = { type: 'search', query: q };
  } else if (nodeId) {
    const node = getNode(nodeId);
    filter = node ? { type: 'category', name: lang === 'en' ? node.nameEn : node.name } : null;
  }

  res.json({
    items,
    total: all.length,
    page,
    limit,
    totalPages: Math.ceil(all.length / limit),
    filter,
    techniqueFacets,
  });
});

// Promobox's own Specifications array is often sparse (sometimes just a
// print size). This adds the other customer-relevant fields Promobox
// returns on the detail endpoint but doesn't put in that array itself.
// Width/Height/Depth are deliberately left out: those are the outer
// carton's dimensions, not the individual item's, and would be misleading
// labeled as a product spec.
const SPEC_LABELS = {
  sr: { model: 'Model', sku: 'Šifra', ean: 'EAN', brand: 'Brend', category: 'Kategorija', color: 'Boja', weight: 'Težina', package: 'Pakovanje', carton: 'Karton', origin: 'Poreklo' },
  en: { model: 'Model', sku: 'Code', ean: 'EAN', brand: 'Brand', category: 'Category', color: 'Color', weight: 'Weight', package: 'Packing', carton: 'Carton', origin: 'Origin' },
};

function buildSpecifications(detail, lang) {
  const labels = SPEC_LABELS[lang];
  const extra = [];

  if (detail.ProductIdView) extra.push({ Id: 'sku', Name: labels.sku, Value: detail.ProductIdView });
  if (detail.Model?.Name) extra.push({ Id: 'model', Name: labels.model, Value: detail.Model.Name });
  if (detail.EAN) extra.push({ Id: 'ean', Name: labels.ean, Value: detail.EAN });
  if (detail.Brand?.Id) extra.push({ Id: 'brand', Name: labels.brand, Value: detail.Brand.Id });
  if (detail.Category?.Name) {
    const category = detail.SubCategory?.Name
      ? `${detail.Category.Name} / ${detail.SubCategory.Name}`
      : detail.Category.Name;
    extra.push({ Id: 'category', Name: labels.category, Value: category });
  }
  if (detail.Color?.Name) extra.push({ Id: 'color', Name: labels.color, Value: detail.Color.Name });
  if (detail.Weight) extra.push({ Id: 'weight', Name: labels.weight, Value: `${detail.Weight} ${detail.WeightUM || ''}`.trim() });
  if (detail.PackageInfo) extra.push({ Id: 'package', Name: labels.package, Value: detail.PackageInfo });
  if (detail.Carton) extra.push({ Id: 'carton', Name: labels.carton, Value: `${detail.Carton} ${detail.UM || ''}`.trim() });
  if (detail.OriginName?.trim()) extra.push({ Id: 'origin', Name: labels.origin, Value: detail.OriginName });

  return [...extra, ...(detail.Specifications || [])];
}

app.get('/api/products/:id', async (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  try {
    const detail = applyMarkup(await getProductDetail(req.params.id, lang));
    const variants = getSiblings(req.params.id, lang).map((p) => {
      const colorInfo = getColorInfo(p.Color, lang);
      return {
        id: p.Id,
        size: p.Size,
        color: p.Color,
        colorName: colorInfo?.Name || p.Color,
        htmlColor: colorInfo?.HtmlColor || '',
        price: p.Price,
      };
    });
    res.json({ ...detail, variants, Specifications: buildSpecifications(detail, lang) });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach Promobox' });
  }
});

// Verifies the reCAPTCHA token with Google before trusting an order came
// from a human. Skipped (with a warning) if the secret key isn't set yet,
// so the order flow still works while you're setting up reCAPTCHA.
async function verifyRecaptcha(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not set - skipping captcha verification');
    return true;
  }
  if (!token) return false;

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

app.post('/api/orders', async (req, res) => {
  const { items, customer, paymentMethod, total, recaptchaToken } = req.body || {};

  const humanVerified = await verifyRecaptcha(recaptchaToken);
  if (!humanVerified) {
    return res.status(400).json({ error: 'Captcha verification failed' });
  }

  const order = {
    orderNumber: generateOrderNumber(),
    createdAt: new Date(),
    items,
    customer,
    paymentMethod,
    total,
  };

  console.log('New order received:', JSON.stringify(order, null, 2));
  await sendOrderEmails(order);

  res.json({ ok: true, orderNumber: order.orderNumber });
});

await refreshProducts();
startProductCache();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
