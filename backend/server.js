import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { getGroupedProducts, getCategoryTree, getDiverseNewest, getSuggestions, getSimilarProducts, getSiblings, getShadeInfo, getStockQty, getProducts, applyMarkup, refreshProducts, startProductCache } from './productCache.js';
import { getProductDetail } from './promobox.js';
import { getNode } from './categoryTree.js';
import { generateOrderNumber, sendOrderEmails } from './email.js';
import { getSettings, updateSettings } from './settings.js';
import { checkPassword, createSession, destroySession, requireAdmin } from './adminAuth.js';
import { getAds, addAd, removeAd, AD_IMAGES_DIR } from './ads.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Locked to the site's own frontend rather than left open to any origin -
// set FRONTEND_ORIGIN in production to the real deployed domain.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads/ads', express.static(AD_IMAGES_DIR));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public - the frontend fetches this once to convert every displayed EUR
// price into RSD, so it needs to be readable without logging in.
app.get('/api/settings', (req, res) => {
  const { eurToRsdRate } = getSettings();
  res.json({ eurToRsdRate });
});

app.post('/api/admin/login', async (req, res) => {
  const { password, recaptchaToken } = req.body || {};

  const humanVerified = await verifyRecaptcha(recaptchaToken);
  if (!humanVerified) {
    return res.status(400).json({ error: 'Captcha verification failed' });
  }

  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  res.json({ token: createSession() });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization.slice(7);
  destroySession(token);
  res.json({ ok: true });
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const rate = Number(req.body?.eurToRsdRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return res.status(400).json({ error: 'Invalid exchange rate' });
  }
  res.json(updateSettings({ eurToRsdRate: rate }));
});

// The extension a saved ad image gets is picked from this map, never taken
// from the uploaded file's own name - an uploaded file renamed to end in
// .html (with a spoofed image/* content-type) would otherwise be served
// back by express.static with an HTML content-type, which is a real XSS risk.
const AD_IMAGE_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const adUpload = multer({
  storage: multer.diskStorage({
    destination: AD_IMAGES_DIR,
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${AD_IMAGE_EXT_BY_MIME[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!AD_IMAGE_EXT_BY_MIME[file.mimetype]) {
      return cb(new Error('Unsupported image type'));
    }
    cb(null, true);
  },
});

function adsResponse() {
  return { items: getAds().map((ad) => ({ id: ad.filename, url: `/uploads/ads/${ad.filename}` })) };
}

// Public - the homepage banner carousel reads whatever ads are currently
// live, no login needed to just view the site.
app.get('/api/ads', (req, res) => {
  res.json(adsResponse());
});

app.post('/api/admin/ads', requireAdmin, (req, res) => {
  adUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    addAd(req.file.filename);
    res.json(adsResponse());
  });
});

app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
  removeAd(req.params.id);
  res.json(adsResponse());
});

app.get('/api/categories', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const localize = (nodes) =>
    nodes.map((n) => ({ ...n, name: lang === 'en' ? n.nameEn : n.name, children: n.children && localize(n.children) }));
  res.json(localize(getCategoryTree()));
});

app.get('/api/products/featured', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 16);
  res.json({ items: getDiverseNewest({ lang, limit }) });
});

// One card per main category for the homepage "shop by category" grid -
// each carries its newest in-stock product's image as a stand-in thumbnail,
// since categories themselves don't have their own image in Promobox.
app.get('/api/categories/featured', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const mains = getCategoryTree();

  const items = mains
    .map((node) => {
      const [thumb] = getGroupedProducts({ lang, nodeId: node.id, inStock: true, sort: 'date_desc' });
      return thumb ? { id: node.id, name: lang === 'en' ? node.nameEn : node.name, count: node.count, image: thumb.image } : null;
    })
    .filter(Boolean);

  res.json({ items });
});

app.get('/api/products/suggest', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const limit = Math.min(10, parseInt(req.query.limit, 10) || 6);
  res.json({ items: getSuggestions({ lang, q: req.query.q, limit }) });
});

app.get('/api/products', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const nodeId = req.query.nodeId || undefined;
  const q = req.query.q || undefined;
  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
  const inStock = req.query.inStock === '1';
  const sort = req.query.sort || undefined;

  const all = getGroupedProducts({ lang, nodeId, q, minPrice, maxPrice, inStock, sort });

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

// A handful of products (mostly gadgety ones like TESLA's levitating lamp)
// carry a "Video" entry in Promobox's own Specifications array whose Value
// isn't spec text at all - it's a raw Vimeo embed snippet (an <iframe> plus
// a <script> tag), which would show up as a garbled wall of markup if
// rendered as plain text like every other spec. Detecting it by content
// (any spec value containing an <iframe) rather than by its Id/Name label
// catches this regardless of language, since Promobox doesn't translate the
// label consistently. Only the iframe's `src` is pulled out and returned as
// a plain URL - the surrounding markup (including that <script> tag) is
// dropped, so the frontend only ever has to render a normal <iframe>
// element, never untrusted raw HTML.
function extractVideo(specifications) {
  const videoSpec = specifications.find((s) => /<iframe/i.test(s.Value || ''));
  if (!videoSpec) return { specifications, videoUrl: null, videoAspectPercent: null };

  // The src attribute's `&` are HTML-entity-encoded (as `&amp;`) in the raw
  // markup - decoding them back is needed since this URL is handed to the
  // frontend as a plain string to set directly as a real src, not parsed
  // from HTML where the browser would decode entities on its own.
  const srcMatch = videoSpec.Value.match(/src="([^"]+)"/i);
  const videoUrl = srcMatch ? srcMatch[1].replace(/&amp;/g, '&') : null;
  // The wrapper div's own `padding:<N>%` is a height/width ratio (the
  // classic CSS aspect-ratio-box trick) - reused here instead of assuming
  // a 16:9 widescreen video, since these product demo clips are often
  // vertical/portrait (this one is 177.78%, i.e. 9:16).
  const paddingMatch = videoSpec.Value.match(/padding:\s*([\d.]+)%/i);
  return {
    specifications: specifications.filter((s) => s !== videoSpec),
    videoUrl,
    videoAspectPercent: paddingMatch ? parseFloat(paddingMatch[1]) : null,
  };
}

app.get('/api/products/:id', async (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  try {
    const detail = applyMarkup(await getProductDetail(req.params.id, lang));
    // Grouped by Shade rather than the broader Color field - several distinct
    // shades (e.g. "Plava" and "Rojal plava") can share one Color code, which
    // would otherwise merge visually different variants into a single swatch.
    const variants = getSiblings(req.params.id, lang).map((p) => {
      const shadeInfo = getShadeInfo(p.Shade, lang);
      return {
        id: p.Id,
        code: p.ProductIdView,
        size: p.Size,
        color: p.Shade,
        colorName: shadeInfo?.Name || p.Color,
        htmlColor: shadeInfo?.HtmlColor || '',
        price: p.Price,
        stockQty: getStockQty(p.Id),
      };
    });
    const { specifications, videoUrl, videoAspectPercent } = extractVideo(buildSpecifications(detail, lang));
    res.json({ ...detail, variants, Specifications: specifications, videoUrl, videoAspectPercent });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach Promobox' });
  }
});

app.get('/api/products/:id/similar', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const limit = Math.min(20, parseInt(req.query.limit, 10) || 8);
  res.json({ items: getSimilarProducts({ id: req.params.id, lang, limit }) });
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
  const { items, customer, paymentMethod, recaptchaToken, lang } = req.body || {};

  const humanVerified = await verifyRecaptcha(recaptchaToken);
  if (!humanVerified) {
    return res.status(400).json({ error: 'Captcha verification failed' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }

  // Price and total are never trusted from the client - each item's price
  // is looked up fresh from the same product cache every page on the site
  // reads from, and the total is computed from that. Without this, a
  // tampered request could set any price it wants.
  const catalog = new Map(getProducts('sr').map((p) => [p.Id, p.Price]));
  const verifiedItems = [];
  for (const item of items) {
    const realPrice = catalog.get(item?.id);
    const quantity = Number(item?.quantity);
    if (realPrice === undefined || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid item in order' });
    }
    verifiedItems.push({ ...item, price: realPrice, quantity });
  }
  const total = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = {
    orderNumber: generateOrderNumber(),
    createdAt: new Date(),
    items: verifiedItems,
    customer,
    paymentMethod,
    total,
    // The customer's own confirmation email is sent in whatever language
    // their site was in - the shop's own notification copy always goes out
    // in Serbian regardless, since that's who's actually reading it.
    customerLang: lang === 'en' ? 'en' : 'sr',
  };

  console.log('New order received:', JSON.stringify(order, null, 2));
  // Cart prices are kept in EUR end to end (the site's source of truth,
  // straight from Promobox) - the order email converts to RSD for display
  // using whatever rate is current right now, same as the site itself.
  await sendOrderEmails({ ...order, eurToRsdRate: getSettings().eurToRsdRate });

  res.json({ ok: true, orderNumber: order.orderNumber });
});

await refreshProducts();
startProductCache();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
