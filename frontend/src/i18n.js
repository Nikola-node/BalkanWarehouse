const strings = {
  sr: {
    price: 'Cena',
    from: 'od',
    size: 'Veličina',
    quantity: 'Količina',
    addToCart: 'Dodaj u korpu',
    description: 'Opis',
    previous: 'Prethodna',
    next: 'Sledeća',
    page: 'Strana',
    of: 'od',
    loading: 'Učitavanje...',
    inStock: 'Na stanju',
    outOfStock: 'Nema na stanju',
  },
}

// Hardcoded for now; swap this (and add strings.en) for a language switcher later.
const lang = 'sr'

export function t(key) {
  return strings[lang][key] ?? key
}
