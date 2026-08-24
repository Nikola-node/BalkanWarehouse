import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getProducts, refreshProducts, startProductCache } from './productCache.js';

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/products', (req, res) => {
  res.json(getProducts());
});

await refreshProducts();
startProductCache();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
