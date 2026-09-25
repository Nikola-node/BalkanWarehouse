import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

let cachedOrders = loadOrders();

function persist() {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(cachedOrders, null, 2));
}

// Newest first - that's the order an admin actually wants to scan a list of
// orders in, so the list endpoint doesn't need its own sort step.
export function getOrders() {
  return [...cachedOrders].reverse();
}

export function addOrder(order) {
  cachedOrders = [...cachedOrders, order];
  persist();
  return order;
}

export function removeOrder(orderNumber) {
  cachedOrders = cachedOrders.filter((o) => o.orderNumber !== orderNumber);
  persist();
  return getOrders();
}
