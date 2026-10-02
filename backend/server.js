import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { getGroupedProducts, getCategoryTree, getPackageSizes, getDiverseNewest, getSuggestions, getSimilarProducts, getSiblings, getShadeInfo, getColorInfo, getStockQty, getProducts, stripWholesalePrice, refreshProducts, startProductCache } from './productCache.js';
import { getProductDetail } from './promobox.js';
import { getNode } from './categoryTree.js';
import { generateOrderNumber, sendOrderEmails, sendContactEmail, SELLER } from './email.js';
import { getSettings, updateSettings } from './settings.js';
import { getDeliveryCost, getDeliveryTiers } from './delivery.js';
import { checkPassword, createSession, destroySession, requireAdmin } from './adminAuth.js';
import { getAds, addAd, removeAd, updateAdLink, AD_IMAGES_DIR } from './ads.js';
import { getOrders, addOrder, removeOrder, getOrder, updateOrder } from './orders.js';
import { buildPaymentFields, verifyResponseHash, capturePayment, voidPayment, refundPayment } from './nestpay.js';

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

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  res.json({ items: getOrders() });
});

app.delete('/api/admin/orders/:orderNumber', requireAdmin, (req, res) => {
  res.json({ items: removeOrder(req.params.orderNumber) });
});

// Only meaningful for a card order still sitting at "paid" (i.e. preAuth'd/
// reserved, per the DMS flow) - settles the actual charge, meant to be
// clicked once the order genuinely ships, never before (2.4 of the bank's
// standards doc: capture can't happen before the goods are shipped).
app.post('/api/admin/orders/:orderNumber/capture', requireAdmin, async (req, res) => {
  const order = getOrder(req.params.orderNumber);
  if (!order || order.paymentMethod !== 'card' || order.status !== 'paid') {
    return res.status(400).json({ error: 'Order is not capturable' });
  }
  const result = await capturePayment(order.orderNumber);
  if (result.response !== 'Approved') {
    return res.status(502).json({ error: result.errMsg || 'Capture failed', result });
  }
  const updated = updateOrder(order.orderNumber, { status: 'captured', capture: result });
  res.json({ items: getOrders(), order: updated });
});

// Releases a reservation without charging the customer - for an order
// that's cancelled before it ships. The bank only accepts a Void within the
// same business day as the original PreAuth (the next day it's already
// settled into their clearing batch, so only a refund/Credit can undo it).
app.post('/api/admin/orders/:orderNumber/void', requireAdmin, async (req, res) => {
  const order = getOrder(req.params.orderNumber);
  if (!order || order.paymentMethod !== 'card' || order.status !== 'paid') {
    return res.status(400).json({ error: 'Order is not voidable' });
  }
  if (new Date(order.createdAt).toDateString() !== new Date().toDateString()) {
    return res.status(400).json({ error: 'Void must be done the same business day as the authorization' });
  }
  const result = await voidPayment(order.orderNumber);
  if (result.response !== 'Approved') {
    return res.status(502).json({ error: result.errMsg || 'Void failed', result });
  }
  const updated = updateOrder(order.orderNumber, { status: 'voided', void: result });
  res.json({ items: getOrders(), order: updated });
});

// Only meaningful once an order has actually been captured - reverses a
// charge that already went through.
app.post('/api/admin/orders/:orderNumber/refund', requireAdmin, async (req, res) => {
  const order = getOrder(req.params.orderNumber);
  if (!order || order.paymentMethod !== 'card' || order.status !== 'captured') {
    return res.status(400).json({ error: 'Order is not refundable' });
  }
  const result = await refundPayment(order.orderNumber);
  if (result.response !== 'Approved') {
    return res.status(502).json({ error: result.errMsg || 'Refund failed', result });
  }
  const updated = updateOrder(order.orderNumber, { status: 'refunded', refund: result });
  res.json({ items: getOrders(), order: updated });
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

function adsResponse(variant) {
  return {
    items: getAds(variant).map((ad) => ({ id: ad.filename, url: `/uploads/ads/${ad.filename}`, link: ad.link || '' })),
  };
}

// Public - the homepage banner carousel reads whatever ads are currently
// live, no login needed to just view the site. 'desktop' is the original
// banner; 'mobile' is a separate image set shown instead on phones.
app.get('/api/ads', (req, res) => {
  res.json(adsResponse('desktop'));
});

app.get('/api/ads/mobile', (req, res) => {
  res.json(adsResponse('mobile'));
});

app.post('/api/admin/ads', requireAdmin, (req, res) => {
  adUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    addAd('desktop', req.file.filename, req.body.link || '');
    res.json(adsResponse('desktop'));
  });
});

app.put('/api/admin/ads/:id', requireAdmin, (req, res) => {
  updateAdLink('desktop', req.params.id, req.body?.link || '');
  res.json(adsResponse('desktop'));
});

app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
  removeAd('desktop', req.params.id);
  res.json(adsResponse('desktop'));
});

app.post('/api/admin/ads/mobile', requireAdmin, (req, res) => {
  adUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    addAd('mobile', req.file.filename, req.body.link || '');
    res.json(adsResponse('mobile'));
  });
});

app.put('/api/admin/ads/mobile/:id', requireAdmin, (req, res) => {
  updateAdLink('mobile', req.params.id, req.body?.link || '');
  res.json(adsResponse('mobile'));
});

app.delete('/api/admin/ads/mobile/:id', requireAdmin, (req, res) => {
  removeAd('mobile', req.params.id);
  res.json(adsResponse('mobile'));
});

app.get('/api/categories', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'sr';
  const localize = (nodes) =>
    nodes.map((n) => ({ ...n, name: lang === 'en' ? n.nameEn : n.name, children: n.children && localize(n.children) }));
  res.json(localize(getCategoryTree()));
});

// Every distinct package size (pieces per package) across the catalog, for
// the "Veličina pakovanja" filter - independent of any other active filter,
// same as /api/categories.
app.get('/api/package-sizes', (req, res) => {
  res.json({ items: getPackageSizes() });
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
  const packageSize = req.query.packageSize !== undefined ? Number(req.query.packageSize) : undefined;
  const sort = req.query.sort || undefined;

  const all = getGroupedProducts({ lang, nodeId, q, minPrice, maxPrice, inStock, packageSize, sort });

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
    const detail = stripWholesalePrice(await getProductDetail(req.params.id, lang));
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
        htmlColor: shadeInfo?.HtmlColor || getColorInfo(p.Color, lang)?.HtmlColor || '',
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

// Price and weight are never trusted from the client - each item's price
// and weight are looked up fresh from the same product cache every page on
// the site reads from. Without this, a tampered request could set any
// price (or weight, to lowball delivery cost) it wants. Returns null if any
// item in the cart doesn't match a real, in-stock-catalog product.
function verifyItems(items) {
  const catalog = new Map(getProducts('sr').map((p) => [p.Id, { price: p.Price, weight: p.Weight || 0 }]));
  const verifiedItems = [];
  let totalWeightKg = 0;
  for (const item of items) {
    const entry = catalog.get(item?.id);
    const quantity = Number(item?.quantity);
    if (!entry || !Number.isInteger(quantity) || quantity <= 0) return null;
    verifiedItems.push({ ...item, price: entry.price, quantity });
    totalWeightKg += entry.weight * quantity;
  }
  return { verifiedItems, totalWeightKg };
}

// Lets the cart show a live delivery estimate as items/quantities change,
// without trusting (or duplicating) the weight-tier math on the frontend -
// it calls this with the same {id, quantity} shape /api/orders expects.
app.post('/api/delivery-cost', (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ weightKg: 0, cost: 0 });
  }
  const result = verifyItems(items);
  if (!result) return res.status(400).json({ error: 'Invalid item in cart' });
  res.json({ weightKg: result.totalWeightKg, cost: getDeliveryCost(result.totalWeightKg) });
});

app.get('/api/delivery-tiers', (req, res) => {
  res.json(getDeliveryTiers());
});

app.post('/api/orders', async (req, res) => {
  const { items, customer, paymentMethod, recaptchaToken, lang } = req.body || {};

  const humanVerified = await verifyRecaptcha(recaptchaToken);
  if (!humanVerified) {
    return res.status(400).json({ error: 'Captcha verification failed' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }

  const result = verifyItems(items);
  if (!result) {
    return res.status(400).json({ error: 'Invalid item in order' });
  }
  const { verifiedItems, totalWeightKg } = result;
  const itemsTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = getDeliveryCost(totalWeightKg);

  const order = {
    orderNumber: generateOrderNumber(),
    createdAt: new Date(),
    items: verifiedItems,
    customer,
    paymentMethod,
    total: itemsTotal,
    // Delivery is priced and shown in RSD (it's a courier's own RSD rate
    // card, not a EUR figure converted like the products are), so it's
    // kept separate from `total`, which stays in EUR like the rest of the
    // order - the email template adds them together after converting.
    deliveryCostRsd: deliveryCost,
    // The customer's own confirmation email is sent in whatever language
    // their site was in - the shop's own notification copy always goes out
    // in Serbian regardless, since that's who's actually reading it.
    customerLang: lang === 'en' ? 'en' : 'sr',
  };

  console.log('New order received:', JSON.stringify(order, null, 2));
  addOrder(order);
  // Cart prices are kept in EUR end to end (the site's source of truth,
  // straight from Promobox) - the order email converts to RSD for display
  // using whatever rate is current right now, same as the site itself.
  await sendOrderEmails({ ...order, eurToRsdRate: getSettings().eurToRsdRate });

  res.json({ ok: true, orderNumber: order.orderNumber });
});

// Public - the 5-element "Potvrda o plaćanju" Banca Intesa's EPM standard
// (Uputstvo, 2.7) requires be shown on the confirmation page itself, not
// just emailed. Safe without auth: the order number is exactly what the
// customer already has from their own checkout/payment redirect (and the
// same data already went to them by email), and it's a
// WEB<timestamp><random> string, not sequentially guessable.
app.get('/api/orders/:orderNumber/confirmation', (req, res) => {
  const order = getOrder(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customer: order.customer,
    items: order.items,
    deliveryCostRsd: order.deliveryCostRsd,
    paymentMethod: order.paymentMethod,
    status: order.status,
    payment: order.payment || null,
    seller: { name: SELLER.name, pib: SELLER.pib, address: SELLER.address },
  });
});

// Card orders don't get finalized/emailed here like cash ones - this only
// creates a *pending* order and hands back the fields (with a server-signed
// hash) needed to redirect the browser to NestPay's own hosted payment page.
// The order is only actually confirmed once NestPay calls back to
// /api/nestpay/success or /api/nestpay/fail below.
// Installment count is merchant-set (not chosen by the cardholder on the
// bank's page) - only these counts are offered to the customer, matching
// what the bank's test matrix (TC35) and typical DinaCard/local-card
// installment plans actually support.
const ALLOWED_INSTALLMENTS = [2, 3, 4, 6, 9, 12];

app.post('/api/orders/card-init', async (req, res) => {
  const { items, customer, recaptchaToken, lang, installments } = req.body || {};

  let installment = '';
  if (installments !== undefined && installments !== null && installments !== '') {
    const n = Number(installments);
    if (!ALLOWED_INSTALLMENTS.includes(n)) {
      return res.status(400).json({ error: 'Invalid installment count' });
    }
    installment = String(n);
  }

  const humanVerified = await verifyRecaptcha(recaptchaToken);
  if (!humanVerified) {
    return res.status(400).json({ error: 'Captcha verification failed' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }

  const result = verifyItems(items);
  if (!result) {
    return res.status(400).json({ error: 'Invalid item in order' });
  }
  const { verifiedItems, totalWeightKg } = result;
  const itemsTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = getDeliveryCost(totalWeightKg);

  const eurToRsdRate = getSettings().eurToRsdRate;
  // Same per-line-then-sum rounding the cart and emails use, so the amount
  // actually charged matches the total the customer saw to the para.
  // Promobox's Price is ex-VAT, so the amount actually charged - the final,
  // tax-inclusive price - needs the *1.2 the customer's own cart total has.
  const itemsCostRsd = verifiedItems.reduce(
    (sum, item) => sum + (Math.round(item.price * eurToRsdRate * 1.2 * 100) / 100) * item.quantity,
    0,
  );
  const amountRsd = (itemsCostRsd + deliveryCost).toFixed(2);

  const orderNumber = generateOrderNumber();
  const order = {
    orderNumber,
    createdAt: new Date(),
    items: verifiedItems,
    customer,
    paymentMethod: 'card',
    total: itemsTotal,
    deliveryCostRsd: deliveryCost,
    customerLang: lang === 'en' ? 'en' : 'sr',
    status: 'pending',
    installment,
  };

  console.log('New pending card order:', JSON.stringify(order, null, 2));
  addOrder(order);

  const publicBackendUrl = process.env.PUBLIC_BACKEND_URL || `http://localhost:${PORT}`;
  const fields = buildPaymentFields({
    clientId: process.env.NESTPAY_TEST_CLIENT_ID,
    oid: orderNumber,
    amount: amountRsd,
    okUrl: `${publicBackendUrl}/api/nestpay/success`,
    failUrl: `${publicBackendUrl}/api/nestpay/fail`,
    currency: '941',
    lang: order.customerLang,
    storeKey: process.env.NESTPAY_TEST_STORE_KEY,
    installment,
  });

  res.json({ gatewayUrl: process.env.NESTPAY_TEST_GATEWAY_URL, fields });
});

// NestPay POSTs the customer's browser here after they pay (or cancel) -
// both okUrl and failUrl land on the same handler since the outcome is read
// from the Response field itself, not from which URL was hit. Needs its own
// urlencoded parser since NestPay posts a plain HTML form, not JSON.
async function handleNestpayCallback(req, res) {
  const body = req.body || {};
  // NestPay sometimes posts `oid` as two identically-named form fields (seen
  // on rejected installment PreAuths) - express's urlencoded parser then
  // turns it into an array, which would otherwise end up stringified as
  // "WEB123,WEB123" in the redirect URL and break every lookup below.
  const rawOid = body.oid || body.ReturnOid;
  const oid = Array.isArray(rawOid) ? rawOid[0] : rawOid;
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const failRedirect = () => res.redirect(`${frontendOrigin}/porudzbina/neuspesna?order=${encodeURIComponent(oid || '')}`);

  // `Response` is only present once a transaction actually reaches the
  // authorization step - if 3D authentication itself fails outright (wrong
  // OTP, ACS error, mdStatus "0"/"5-8"), NestPay posts back oid/clientid/a
  // valid hash but no Response at all. That's still a legitimate, verifiable
  // callback for a failed payment, not something to discard as malformed.
  if (!oid || !body.clientid) {
    console.error('NestPay callback: missing required parameters', body);
    return failRedirect();
  }

  if (body.clientid !== process.env.NESTPAY_TEST_CLIENT_ID) {
    console.error('NestPay callback: client id mismatch');
    return failRedirect();
  }

  if (!verifyResponseHash(body, process.env.NESTPAY_TEST_STORE_KEY)) {
    console.error('NestPay callback: hash verification failed for order', oid);
    return failRedirect();
  }

  const order = getOrder(oid);
  if (!order) {
    console.error('NestPay callback: unknown order', oid);
    return failRedirect();
  }

  const approved = body.Response === 'Approved';
  const payment = {
    oid,
    authCode: body.AuthCode || '',
    transId: body.TransId || '',
    response: body.Response || 'Error',
    procReturnCode: body.ProcReturnCode || '',
    mdStatus: body.mdStatus || '',
    transactionDate: body['EXTRA.TRXDATE'] || '',
  };

  const updated = updateOrder(oid, { status: approved ? 'paid' : 'failed', payment });
  await sendOrderEmails({ ...updated, eurToRsdRate: getSettings().eurToRsdRate });

  res.redirect(`${frontendOrigin}/porudzbina/${approved ? 'uspesna' : 'neuspesna'}?order=${encodeURIComponent(oid)}`);
}

app.post('/api/nestpay/success', express.urlencoded({ extended: true }), handleNestpayCallback);
app.post('/api/nestpay/fail', express.urlencoded({ extended: true }), handleNestpayCallback);

app.post('/api/contact', async (req, res) => {
  const { name, email, message, recaptchaToken } = req.body || {};

  const humanVerified = await verifyRecaptcha(recaptchaToken);
  if (!humanVerified) {
    return res.status(400).json({ error: 'Captcha verification failed' });
  }

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() });

  res.json({ ok: true });
});

await refreshProducts();
startProductCache();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
