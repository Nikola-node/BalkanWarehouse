import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getGroupedProducts, getSiblings, getColorInfo, applyMarkup, refreshProducts, startProductCache } from './productCache.js';
import { getProductDetail } from './promobox.js';

const app = express();
const PORT = 3001;

app.use(cors());

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
    res.json({ ...detail, variants });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach Promobox' });
  }
});

await refreshProducts();
startProductCache();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
