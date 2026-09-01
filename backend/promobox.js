const ROOT = 'https://apiv1.promosolution.services';
const CULTURES = { sr: 'sr-Latin-CS', en: 'en' };

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const stillValid = cachedToken && Date.now() < tokenExpiresAt;
  if (stillValid) {
    return cachedToken;
  }

  const res = await fetch(`${ROOT}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      username: process.env.PROMOBOX_USERNAME,
      password: process.env.PROMOBOX_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`Promobox login failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh 60 seconds before it actually expires, as a safety margin.
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

export async function getAllProducts(lang = 'sr') {
  const token = await getAccessToken();

  const res = await fetch(`${ROOT}/${CULTURES[lang]}/api/Product`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox product fetch failed: ${res.status}`);
  }

  return res.json();
}

// One entry per Model (matches product.Model 1:1), carries the model's
// representative image - the /api/Product list itself has no image field.
export async function getModels(lang = 'sr') {
  const token = await getAccessToken();

  const res = await fetch(`${ROOT}/${CULTURES[lang]}/api/Model`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox model fetch failed: ${res.status}`);
  }

  return res.json();
}

// Bulk stock levels for every SKU across all warehouses - the product list
// and model list endpoints carry neither.
// Stock quantities are plain numbers with no language-dependent text, so
// this is fetched once and shared across both languages.
export async function getProductStock() {
  const token = await getAccessToken();

  const res = await fetch(`${ROOT}/${CULTURES.sr}/api/ProductStock`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox stock fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function getColors(lang = 'sr') {
  const token = await getAccessToken();

  const res = await fetch(`${ROOT}/${CULTURES[lang]}/api/Color`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox color fetch failed: ${res.status}`);
  }

  return res.json();
}

// Shade is the specific per-variant color (e.g. "Rojal plava"), unlike the
// broader Color field a product row carries - several distinct shades can
// share one Color code (both "Plava" and "Rojal plava" are Color "B - PL"),
// so Shade is what's needed to tell a model's individual color variants apart.
export async function getShades(lang = 'sr') {
  const token = await getAccessToken();

  const res = await fetch(`${ROOT}/${CULTURES[lang]}/api/Shade`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox shade fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function getProductDetail(id, lang = 'sr') {
  const token = await getAccessToken();

  // A handful of ids contain a literal "/" (e.g. size "L/XL"), which breaks
  // the /api/Product/{id} path form, so id is passed as a query param instead.
  const url = new URL(`${ROOT}/${CULTURES[lang]}/api/Product/`);
  url.searchParams.set('id', id);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox product detail fetch failed: ${res.status}`);
  }

  return res.json();
}
