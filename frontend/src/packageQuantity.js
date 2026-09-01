// Promobox's own `CommercialPackage` field (the minimum sellable unit) is
// unreliable - sampling the catalog found it reporting 1 (individually
// sellable) for plenty of products whose displayed "Pakovanje" spec clearly
// shows a real inner-package size, e.g. LUVIA COLOR shows "500/50" but its
// CommercialPackage field says 1, letting customers order a single piece of
// something Promobox only actually ships in boxes of 50. The `Package`/
// `PackageInfo` string customers already see doesn't have this problem, so
// package sizes are parsed from that instead.
//
// The string isn't fixed at 2 segments - it's usually "carton/innerPack",
// but some products (e.g. FALCO: "500/250/1") list three or more real,
// independently orderable sizes, and a trailing "/1" isn't always filler -
// it can mean the product genuinely ships individually too. Every segment
// is parsed, not just the first two, so this doesn't silently drop a real
// package size no matter how many a product lists.
export function parsePackageSizes(packageString) {
  if (!packageString) return []
  return packageString
    .split('/')
    .map((part) => parseInt(part, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
}

// A valid order quantity is any sum you can make out of the package sizes
// (50, 100, 150, ..., 1000, 1050, ...). This checks whether `quantity` can be
// built as a*p1 + b*p2 + ... for non-negative integers a, b, ... using the
// given package sizes.
export function canFormQuantity(quantity, packageSizes) {
  const sizes = packageSizes.filter((size) => Number.isInteger(size) && size > 0)
  if (!Number.isInteger(quantity) || quantity <= 0) return false
  if (sizes.length === 0) return true

  const reachable = new Array(quantity + 1).fill(false)
  reachable[0] = true
  for (let amount = 1; amount <= quantity; amount++) {
    for (const size of sizes) {
      if (size <= amount && reachable[amount - size]) {
        reachable[amount] = true
        break
      }
    }
  }
  return reachable[quantity]
}
