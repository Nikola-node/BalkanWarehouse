// Promobox sells most items only in fixed package sizes (e.g. a commercial
// pack of 50 and a full carton of 1000). A valid order quantity is any sum
// you can make out of those package sizes (50, 100, 150, ..., 1000, 1050, ...).
// This checks whether `quantity` can be built as a*p1 + b*p2 + ... for
// non-negative integers a, b, ... using the given package sizes.
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
