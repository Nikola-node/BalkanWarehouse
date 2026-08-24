import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getGroupedProducts, getSiblings, getColorInfo, applyMarkup, refreshProducts, startProductCache } from './productCache.js';
import { getProductDetail } from './promobox.js';
import { generateOrderNumber, sendOrderEmails } from './email.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/products', (req, res) => {
  const all = getGroupedProducts();

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 24);

  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  res.json({
    items,
    total: all.length,
    page,
    limit,
    totalPages: Math.ceil(all.length / limit),
  });
});

// Promobox's own Specifications array is often sparse (sometimes just a
// print size). This adds the other customer-relevant fields Promobox
// returns on the detail endpoint but doesn't put in that array itself.
// Width/Height/Depth are deliberately left out: those are the outer
// carton's dimensions, not the individual item's, and would be misleading
// labeled as a product spec.
function buildSpecifications(detail) {
  const extra = [];

  if (detail.ProductIdView) extra.push({ Id: 'sku', Name: 'Šifra', Value: detail.ProductIdView });
  if (detail.EAN) extra.push({ Id: 'ean', Name: 'EAN', Value: detail.EAN });
  if (detail.Brand?.Id) extra.push({ Id: 'brand', Name: 'Brend', Value: detail.Brand.Id });
  if (detail.Category?.Name) {
    const category = detail.SubCategory?.Name
      ? `${detail.Category.Name} / ${detail.SubCategory.Name}`
      : detail.Category.Name;
    extra.push({ Id: 'category', Name: 'Kategorija', Value: category });
  }
  if (detail.Color?.Name) extra.push({ Id: 'color', Name: 'Boja', Value: detail.Color.Name });
  if (detail.Weight) extra.push({ Id: 'weight', Name: 'Težina', Value: `${detail.Weight} ${detail.WeightUM || ''}`.trim() });
  if (detail.PackageInfo) extra.push({ Id: 'package', Name: 'Pakovanje', Value: detail.PackageInfo });
  if (detail.Carton) extra.push({ Id: 'carton', Name: 'Karton', Value: `${detail.Carton} ${detail.UM || ''}`.trim() });
  if (detail.OriginName?.trim()) extra.push({ Id: 'origin', Name: 'Poreklo', Value: detail.OriginName });

  return [...extra, ...(detail.Specifications || [])];
}

app.get('/api/products/:id', async (req, res) => {
  try {
    const detail = applyMarkup(await getProductDetail(req.params.id));
    const variants = getSiblings(req.params.id).map((p) => {
      const colorInfo = getColorInfo(p.Color);
      return {
        id: p.Id,
        size: p.Size,
        color: p.Color,
        colorName: colorInfo?.Name || p.Color,
        htmlColor: colorInfo?.HtmlColor || '',
        price: p.Price,
      };
    });
    res.json({ ...detail, variants, Specifications: buildSpecifications(detail) });
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
