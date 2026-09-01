import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
export const AD_IMAGES_DIR = path.join(DATA_DIR, 'ads');

fs.mkdirSync(AD_IMAGES_DIR, { recursive: true });

function loadAds() {
  try {
    return JSON.parse(fs.readFileSync(ADS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

let cachedAds = loadAds();

function persist() {
  fs.writeFileSync(ADS_FILE, JSON.stringify(cachedAds, null, 2));
}

export function getAds() {
  return cachedAds;
}

export function addAd(filename) {
  cachedAds = [...cachedAds, { filename, createdAt: new Date().toISOString() }];
  persist();
  return cachedAds;
}

// `filename` only ever gets used as a filesystem path after being matched
// against an entry already in cachedAds - it's never joined into a path
// straight from the request, so a crafted id (e.g. "../../server.js")
// can't escape AD_IMAGES_DIR even though it originates from a URL param.
export function removeAd(filename) {
  const ad = cachedAds.find((a) => a.filename === filename);
  if (!ad) return cachedAds;

  cachedAds = cachedAds.filter((a) => a.filename !== filename);
  persist();
  fs.unlink(path.join(AD_IMAGES_DIR, ad.filename), () => {});
  return cachedAds;
}
