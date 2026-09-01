import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Settings an admin can change without a code edit or redeploy - currently
// just the display exchange rate, but the same file/endpoints are meant to
// grow to hold things like homepage ad/banner content later.
const DEFAULT_SETTINGS = {
  eurToRsdRate: 117.5,
};

let cachedSettings = loadSettings();

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function getSettings() {
  return cachedSettings;
}

export function updateSettings(patch) {
  cachedSettings = { ...cachedSettings, ...patch };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
  return cachedSettings;
}
