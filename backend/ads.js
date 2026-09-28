import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
// Both variants' uploaded images share one directory - filenames are
// randomUUID-based (see server.js's adUpload config), so there's no
// collision risk between the two, and it keeps a single static-serving
// route (/uploads/ads) covering both.
export const AD_IMAGES_DIR = path.join(DATA_DIR, 'ads');

fs.mkdirSync(AD_IMAGES_DIR, { recursive: true });

// 'desktop' is the original homepage banner; 'mobile' is a separate set of
// images shown instead when the site is opened on a phone (see the
// hero-carousel-desktop-only/-mobile-only split in App.css) - kept as
// entirely separate registries (own JSON file, own ad list) since a mobile
// banner is typically a differently-cropped/sized image, not just the
// desktop one resized.
const ADS_FILE_BY_VARIANT = {
  desktop: path.join(DATA_DIR, 'ads.json'),
  mobile: path.join(DATA_DIR, 'ads-mobile.json'),
};

function loadAds(variant) {
  try {
    return JSON.parse(fs.readFileSync(ADS_FILE_BY_VARIANT[variant], 'utf-8'));
  } catch {
    return [];
  }
}

let cachedAds = { desktop: loadAds('desktop'), mobile: loadAds('mobile') };

function persist(variant) {
  fs.writeFileSync(ADS_FILE_BY_VARIANT[variant], JSON.stringify(cachedAds[variant], null, 2));
}

export function getAds(variant = 'desktop') {
  return cachedAds[variant];
}

export function addAd(variant, filename, link = '') {
  cachedAds[variant] = [...cachedAds[variant], { filename, link, createdAt: new Date().toISOString() }];
  persist(variant);
  return cachedAds[variant];
}

export function updateAdLink(variant, filename, link) {
  cachedAds[variant] = cachedAds[variant].map((a) => (a.filename === filename ? { ...a, link } : a));
  persist(variant);
  return cachedAds[variant];
}

// `filename` only ever gets used as a filesystem path after being matched
// against an entry already in cachedAds - it's never joined into a path
// straight from the request, so a crafted id (e.g. "../../server.js")
// can't escape AD_IMAGES_DIR even though it originates from a URL param.
export function removeAd(variant, filename) {
  const ad = cachedAds[variant].find((a) => a.filename === filename);
  if (!ad) return cachedAds[variant];

  cachedAds[variant] = cachedAds[variant].filter((a) => a.filename !== filename);
  persist(variant);
  fs.unlink(path.join(AD_IMAGES_DIR, ad.filename), () => {});
  return cachedAds[variant];
}
