// Promobox has no structured "print technique" field. It's buried as free
// text inside a Model's ExtDescr entries, e.g. "... Preporučena štampa:
// tampon" - sometimes followed by more labeled fields on the same entry,
// sometimes listing several techniques separated by a comma/slash/" i ".
// This extracts and normalizes that into the same technique categories
// Promobox's own site filters by (plus a few real ones found in the data
// that aren't in every category: vez/embroidery, suvi žig, folija tisak).
// English names are Promobox's own site labels (confirmed directly against
// their English print-type filter), not a literal translation of the
// Serbian - e.g. "stiker" in the Serbian text is their "Sticker" on-site,
// even though the same text translates word-for-word to "doming".
export const TECHNIQUES = [
  { id: 'digitalna', name: 'Digitalna', nameEn: 'Digital printing' },
  { id: 'dtg', name: 'DTG (digitalna štampa)', nameEn: 'DTG' },
  { id: 'laser', name: 'Laser', nameEn: 'Laser engraving' },
  { id: 'nalepnica', name: 'Nalepnica', nameEn: 'Sticker' },
  { id: 'pecenje-preslikaca', name: 'Pečenje preslikača', nameEn: 'Heat transfer' },
  { id: 'preslikac', name: 'Preslikač', nameEn: 'Transfer printing' },
  { id: 'sito', name: 'Sito', nameEn: 'Screen printing' },
  { id: 'sublimacija', name: 'Sublimacija', nameEn: 'Sublimation' },
  { id: 'tampon', name: 'Tampon', nameEn: 'Pad printing' },
  { id: 'vez', name: 'Vez', nameEn: 'Embroidery' },
  { id: 'suvi-zig', name: 'Suvi žig', nameEn: 'Hot stamping' },
  { id: 'folija-tisak', name: 'Folija tisak', nameEn: 'Foil stamping' },
];

// Order matters: more specific phrases are checked before the generic ones
// they'd otherwise get swallowed by (e.g. "pečenje preslikača" before
// "preslikač", "dtg"/"digitalna" before the bare "tampon" check).
const MATCHERS = [
  { id: 'dtg', test: (s) => s.includes('dtg') },
  { id: 'laser', test: (s) => s.includes('laser') },
  { id: 'digitalna', test: (s) => s.includes('digitalna') },
  { id: 'sublimacija', test: (s) => s.includes('sublimacij') || s.includes('sumblimacij') },
  { id: 'sito', test: (s) => s.includes('sito') },
  { id: 'pecenje-preslikaca', test: (s) => s.includes('pečenje preslikač') },
  { id: 'preslikac', test: (s) => s.includes('preslikač') },
  { id: 'nalepnica', test: (s) => s.includes('stiker') || s.includes('nalepnic') },
  { id: 'suvi-zig', test: (s) => s.includes('suvi žig') },
  { id: 'folija-tisak', test: (s) => s.includes('folija tisak') },
  { id: 'tampon', test: (s) => /\btampon\b/.test(s) },
  { id: 'vez', test: (s) => /\bvez\b/.test(s) },
];

const unmatchedPhrases = new Map();

// A Model's ExtDescr array; returns the set of technique ids found on it.
export function extractTechniques(extDescr) {
  const found = new Set();

  for (const entry of extDescr || []) {
    const text = entry.Description || '';
    const idx = text.toLowerCase().indexOf('preporučena štampa');
    if (idx === -1) continue;

    const after = text.slice(idx).match(/preporučena štampa:?\s*([^]*)/i);
    if (!after) continue;

    // The field usually ends the entry, but occasionally more labeled data
    // follows on the same line (e.g. "... Preporučena štampa: tampon
    // Materijal: ...") - stop at the next "Label:" so that isn't captured.
    let captured = after[1];
    const nextLabel = captured.search(/\b[A-ZŠĐČĆŽ][\wšđčćžA-ZŠĐČĆŽ]*\s*:/);
    if (nextLabel > 0) captured = captured.slice(0, nextLabel);

    for (const part of captured.split(/[,/]|\s+i\s+/i)) {
      const clean = part.trim().toLowerCase();
      if (!clean) continue;

      const match = MATCHERS.find((m) => m.test(clean));
      if (match) {
        found.add(match.id);
      } else if (/[a-zšđčćž]/.test(clean)) {
        unmatchedPhrases.set(clean, (unmatchedPhrases.get(clean) || 0) + 1);
      }
    }
  }

  return [...found];
}

export function getUnmatchedPhrases() {
  return [...unmatchedPhrases.entries()].map(([phrase, count]) => ({ phrase, count }));
}

export function resetUnmatchedPhrases() {
  unmatchedPhrases.clear();
}
