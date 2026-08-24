const ROOT = 'https://apiv1.promosolution.services';
const CULTURE = 'sr-Latin-CS';

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

export async function getAllProducts() {
  const token = await getAccessToken();

  const res = await fetch(`${ROOT}/${CULTURE}/api/Product`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox product fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function getProductDetail(id) {
  const token = await getAccessToken();

  // A handful of ids contain a literal "/" (e.g. size "L/XL"), which breaks
  // the /api/Product/{id} path form, so id is passed as a query param instead.
  const url = new URL(`${ROOT}/${CULTURE}/api/Product/`);
  url.searchParams.set('id', id);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Promobox product detail fetch failed: ${res.status}`);
  }

  return res.json();
}
