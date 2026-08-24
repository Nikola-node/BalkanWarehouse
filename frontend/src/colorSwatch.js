// Promobox's color codebook leaves a handful of entries without a hex value
// (mostly metallic/undefined ones) - without this they'd all render as the
// same generic gray swatch and become indistinguishable from each other.
const COLOR_FALLBACKS = {
  'B - BL': '#ffffff', // Bela (white)
  'B - GD': '#d4af37', // Zlatna (gold)
  'B - MT': '#a8a9ad', // Metal
  'B - PE': '#b2beb5', // Pepeljasta (ash gray)
  'B - SLV': '#c0c0c0', // Srebrna (silver)
}

export function swatchColor(id, htmlColor) {
  return htmlColor || COLOR_FALLBACKS[id] || '#e5e5e5'
}
