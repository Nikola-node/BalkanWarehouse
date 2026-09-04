// Weight-tier delivery pricing (RSD) - based on the courier's own rate
// sheet, with a flat 150 RSD shop markup added on top of each fixed tier.
// The per-kg rate past 20kg is left at the courier's own raw rate, not
// marked up.
const TIERS = [
  { upToKg: 0.5, price: 570 },
  { upToKg: 1, price: 600 },
  { upToKg: 2, price: 650 },
  { upToKg: 5, price: 750 },
  { upToKg: 10, price: 950 },
  { upToKg: 20, price: 1250 },
];
const PER_KG_OVER_20 = 60;

export function getDeliveryCost(weightKg) {
  const tier = TIERS.find((t) => weightKg <= t.upToKg);
  if (tier) return tier.price;
  // Past 20kg the courier charges the 20kg tier price plus a per-kg rate
  // for every kg or part of a kg beyond that.
  const extraKg = Math.ceil(weightKg - 20);
  return 1250 + extraKg * PER_KG_OVER_20;
}

export function getDeliveryTiers() {
  return { tiers: TIERS, perKgOver20: PER_KG_OVER_20 };
}
