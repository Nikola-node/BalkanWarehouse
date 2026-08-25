// This is a hand-curated category tree (provided by the shop owner, based on
// Promobox's own retail site) that does NOT match Promobox's B2B API
// Category/SubCategory fields - that API only gives 13 flat categories with
// ~65 subcategories, no 3rd level, and different groupings (e.g. "Upaljači"
// is its own top category there, but nested under "Kućni setovi" here).
// Since there's no API endpoint that maps a product to this tree, products
// are classified by matching keywords in their (Serbian) name against rules
// below, grouped by their real Promobox category since that keeps the
// keyword rules narrow and avoids false positives across unrelated domains.
const TREE = [
  { name: 'Kućni setovi', nameEn: 'Home', children: [
    { name: 'Šolje', nameEn: 'Mugs', children: [
      { name: 'Keramičke šolje', nameEn: 'Ceramic mugs' }, { name: 'Staklene šolje', nameEn: 'Glass mugs' }, { name: 'Metalne šolje', nameEn: 'Metal mugs' },
    ] },
    { name: 'Boce', nameEn: 'Bottles', children: [
      { name: 'Metalne boce', nameEn: 'Metal bottles' }, { name: 'Staklene boce', nameEn: 'Glass bottles' }, { name: 'Plastične boce', nameEn: 'Plastic bottles' },
    ] },
    { name: 'Termosi', nameEn: 'Thermoses' },
    { name: 'Kuhinjski pribor', nameEn: 'Kitchen utensils', children: [
      { name: 'Kuhinjski setovi', nameEn: 'Kitchen sets' }, { name: 'Posude', nameEn: 'Dishware' }, { name: 'Pepeljare', nameEn: 'Ashtrays' },
      { name: 'Otvarači za flaše', nameEn: 'Bottle openers' }, { name: 'Magneti', nameEn: 'Magnets' }, { name: 'Podmetači', nameEn: 'Coasters' },
    ] },
    { name: 'Vinski setovi', nameEn: 'Wine sets' },
    { name: 'Sport i zabava', nameEn: 'Sport and leisure' },
    { name: 'Lepota', nameEn: 'Beauty' },
    { name: 'Zdravlje i zaštita', nameEn: 'Health and personal protection' },
    { name: 'Upaljači', nameEn: 'Lighters', children: [
      { name: 'Plastični upaljači', nameEn: 'Plastic lighters' }, { name: 'Metalni upaljači', nameEn: 'Metal lighters' }, { name: 'Oprema za cigare', nameEn: 'Cigar accessories' },
    ] },
  ] },
  { name: 'Tehnologija', nameEn: 'Technology', children: [
    { name: 'Pomoćne baterije', nameEn: 'Power banks' },
    { name: 'Audio uređaji', nameEn: 'Audio devices', children: [
      { name: 'Zvučnici', nameEn: 'Speakers' }, { name: 'Slušalice', nameEn: 'Headphones' }, { name: 'Slušalice bubice', nameEn: 'Earbuds' },
    ] },
    { name: 'Auto oprema', nameEn: 'Car accessories' },
    { name: 'Gedžeti', nameEn: 'Gadgets' },
    { name: 'USB', nameEn: 'USB', children: [{ name: 'USB', nameEn: 'USB drives' }, { name: 'SSD', nameEn: 'SSD' }] },
    { name: 'Bežični punjači', nameEn: 'Wireless chargers' },
    { name: 'USB kablovi', nameEn: 'USB cables' },
    { name: 'Pametni satovi', nameEn: 'Smart watches' },
    { name: 'Tech portfolio', nameEn: 'Tech portfolio' },
    { name: 'Kompjuterska oprema', nameEn: 'Computer accessories' },
  ] },
  { name: 'Kancelarija', nameEn: 'Office', children: [
    { name: 'Notesi i agende', nameEn: 'Notebooks & planners', children: [
      { name: 'Notesi', nameEn: 'Notebooks' }, { name: 'Agende', nameEn: 'Planners' }, { name: 'Portfolio', nameEn: 'Portfolios' },
    ] },
    { name: 'Kancelarija', nameEn: 'Office supplies', children: [
      { name: 'Setovi za beleške', nameEn: 'Notepad sets' }, { name: 'Vizitari', nameEn: 'Business card holders' }, { name: 'Kancelarijski pribor', nameEn: 'Office supplies' },
      { name: 'Školski pribor', nameEn: 'School supplies' }, { name: 'Držači za ID kartice', nameEn: 'ID card holders' }, { name: 'Stone lampe', nameEn: 'Desk lamps' },
    ] },
    { name: 'Satovi', nameEn: 'Watches' },
    { name: 'Promo pultovi i panoi', nameEn: 'Promo counters & panels' },
    { name: 'Poklon kutije', nameEn: 'Gift boxes' },
  ] },
  { name: 'Olovke', nameEn: 'Pens', children: [
    { name: 'Plastične olovke', nameEn: 'Plastic pens' }, { name: 'Metalne olovke', nameEn: 'Metal pens' }, { name: 'Setovi olovaka', nameEn: 'Pen sets' }, { name: 'Drvene olovke', nameEn: 'Wooden pens' },
  ] },
  { name: 'Privesci & Alati', nameEn: 'Key holders & Tools', children: [
    { name: 'Privesci', nameEn: 'Key holders', children: [
      { name: 'Metalni privesci', nameEn: 'Metal key holders' }, { name: 'Plastični privesci', nameEn: 'Plastic key holders' }, { name: 'Drveni privesci', nameEn: 'Wooden key holders' }, { name: 'Ostali privesci', nameEn: 'Other key holders' },
    ] },
    { name: 'Alati', nameEn: 'Tools', children: [
      { name: 'Ručni alat', nameEn: 'Hand tools' }, { name: 'Izviđačka oprema', nameEn: 'Outdoor gear' }, { name: 'Lampe', nameEn: 'Flashlights' }, { name: 'Merni pribor', nameEn: 'Measuring tools' }, { name: 'Auto oprema', nameEn: 'Car accessories' },
    ] },
  ] },
  { name: 'Torbe & Putovanje', nameEn: 'Bags & Travel', children: [
    { name: 'Rančevi', nameEn: 'Backpacks', children: [{ name: 'Sportski rančevi', nameEn: 'Sport backpacks' }, { name: 'Poslovni rančevi', nameEn: 'Business backpacks' }] },
    { name: 'Torbe', nameEn: 'Bags', children: [
      { name: 'Konferencijske torbe', nameEn: 'Conference bags' }, { name: 'Sportske i putne torbe', nameEn: 'Sport & travel bags' }, { name: 'Frižider torbe', nameEn: 'Cooler bags' },
    ] },
    { name: 'Putni program', nameEn: 'Travel accessories' },
    { name: 'Kese', nameEn: 'Tote bags', children: [
      { name: 'PP kese', nameEn: 'PP bags' }, { name: 'Papirne kese', nameEn: 'Paper bags' }, { name: 'Pamučne kese', nameEn: 'Cotton bags' }, { name: 'Juta kese', nameEn: 'Jute bags' },
    ] },
    { name: 'Kišobrani', nameEn: 'Umbrellas', children: [{ name: 'Kišobrani', nameEn: 'Standard umbrellas' }, { name: 'Sklopivi kišobrani', nameEn: 'Folding umbrellas' }] },
  ] },
  { name: 'Tekstil', nameEn: 'Textile', children: [
    { name: 'Majice', nameEn: 'T-shirts', children: [
      { name: 'Unisex majice', nameEn: 'Unisex t-shirts' }, { name: 'Ženske majice', nameEn: "Women's t-shirts" }, { name: 'Dečije majice', nameEn: "Kids' t-shirts" }, { name: 'Sportske majice', nameEn: 'Sport t-shirts' },
    ] },
    { name: 'Polo majice', nameEn: 'Polo shirts', children: [{ name: 'Unisex polo majice', nameEn: 'Unisex polo shirts' }, { name: 'Ženske polo majice', nameEn: "Women's polo shirts" }] },
    { name: 'Sportska oprema', nameEn: 'Sportswear', children: [{ name: 'Duksarice', nameEn: 'Hoodies' }, { name: 'Donji deo trenerki', nameEn: 'Sweatpants' }, { name: 'Šorcevi', nameEn: 'Shorts' }] },
    { name: 'Prsluci', nameEn: 'Vests', children: [{ name: 'Radni prsluci', nameEn: 'Work vests' }, { name: 'Štepani prsluci', nameEn: 'Quilted vests' }, { name: 'Softshell prsluci', nameEn: 'Softshell vests' }] },
    { name: 'Jakne', nameEn: 'Jackets', children: [{ name: 'Zimske jakne i vetrovke', nameEn: 'Winter jackets & windbreakers' }, { name: 'Softshell jakne', nameEn: 'Softshell jackets' }] },
    { name: 'Poslovna oprema', nameEn: 'Business wear', children: [
      { name: 'Košulje', nameEn: 'Shirts' }, { name: 'Pantalone', nameEn: 'Trousers' }, { name: 'Kecelje i oprema', nameEn: 'Aprons & accessories' }, { name: 'Modni dodaci', nameEn: 'Fashion accessories' },
    ] },
    { name: 'Peškiri', nameEn: 'Towels' },
    { name: 'Kape', nameEn: 'Headwear', children: [{ name: 'Kačketi', nameEn: 'Caps' }, { name: 'Šeširi', nameEn: 'Hats' }, { name: 'Zimski program', nameEn: 'Winter headwear' }] },
  ] },
  { name: 'Radna oprema', nameEn: 'Workwear', children: [
    { name: 'Radna odeća', nameEn: 'Work clothing', children: [
      { name: 'Radne pantalone', nameEn: 'Work trousers' }, { name: 'Radne jakne', nameEn: 'Work jackets' }, { name: 'Radne bermude', nameEn: 'Work shorts' }, { name: 'Radni prsluci', nameEn: 'Work vests' },
    ] },
    { name: 'Zaštitna obuća', nameEn: 'Protective footwear', children: [{ name: 'Sigurnosna obuća', nameEn: 'Safety footwear' }, { name: 'Radna obuća', nameEn: 'Work footwear' }] },
    { name: 'Sigurnosna odeća', nameEn: 'Safety clothing' },
    { name: 'Dodatna radna oprema', nameEn: 'Additional workwear' },
  ] },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/š/g, 's').replace(/đ/g, 'dj').replace(/č/g, 'c').replace(/ć/g, 'c').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Walks TREE once, assigning each node a stable `id` (a slash-joined path of
// slugs) and a `path` array of those slugs, so both the tree and the
// classifier below can address any node the same way.
function buildIndex() {
  const byPath = new Map();

  function visit(nodes, parentPath) {
    return nodes.map((node) => {
      const slug = slugify(node.name);
      const path = [...parentPath, slug];
      const children = node.children ? visit(node.children, path) : undefined;
      const built = { id: path.join('/'), name: node.name, nameEn: node.nameEn, path, children };
      byPath.set(built.id, built);
      return built;
    });
  }

  const tree = visit(TREE, []);
  return { tree, byPath };
}

const { tree: INDEXED_TREE, byPath: NODES_BY_PATH } = buildIndex();

function n(name) {
  return NODES_BY_PATH.get(name).path;
}


// --- Classification, backed by Promobox's own GroupWeb1/GroupWeb2/GroupWeb3
// fields (from the /api/Model endpoint) - these are the exact fields
// Promobox's own retail site uses to build this category menu, discovered
// by noticing the branching counts under every GroupWeb2 code matched this
// tree's child counts exactly, then confirming each leaf's real product
// names by hand. This replaced an earlier keyword-guessing classifier that
// worked from product names alone, since Group1/2/3 (a different, similarly
// named field on the raw /api/Product endpoint) turned out to be unreliable
// legacy data with no name lookup - GroupWeb1/2/3 is the real thing.
const GROUPWEB_LEAF = {
  'KA|KA-01|KA-01-01': 'kancelarija/notesi-i-agende/notesi',
  'KA|KA-01|KA-01-07': 'kancelarija/notesi-i-agende/agende',
  'KA|KA-01|KA-01-09': 'kancelarija/notesi-i-agende/portfolio',
  'KA|KA-04|KA-04-01': 'kancelarija/kancelarija/setovi-za-beleske',
  'KA|KA-04|KA-04-05': 'kancelarija/kancelarija/vizitari',
  'KA|KA-04|KA-04-07': 'kancelarija/kancelarija/kancelarijski-pribor',
  'KA|KA-04|KA-04-08': 'kancelarija/kancelarija/skolski-pribor',
  'KA|KA-04|KA-04-09': 'kancelarija/kancelarija/drzaci-za-id-kartice',
  'KA|KA-04|KA-04-11': 'kancelarija/kancelarija/stone-lampe',
  'KA|KA-07|KA-07-01': 'kancelarija/satovi',
  'KA|KA-10|KA-10-01': 'kancelarija/promo-pultovi-i-panoi',
  'KA|KA-13|KA-13-01': 'kancelarija/poklon-kutije',

  'KS|KS-01|KS-01-01': 'kucni-setovi/solje/keramicke-solje',
  'KS|KS-01|KS-01-03': 'kucni-setovi/solje/staklene-solje',
  'KS|KS-01|KS-01-07': 'kucni-setovi/solje/metalne-solje',
  'KS|KS-04|KS-04-01': 'kucni-setovi/boce/metalne-boce',
  'KS|KS-04|KS-04-03': 'kucni-setovi/boce/staklene-boce',
  'KS|KS-04|KS-04-05': 'kucni-setovi/boce/plasticne-boce',
  'KS|KS-07|KS-07-01': 'kucni-setovi/termosi',
  'KS|KS-10|KS-10-01': 'kucni-setovi/kuhinjski-pribor/kuhinjski-setovi',
  'KS|KS-10|KS-10-03': 'kucni-setovi/kuhinjski-pribor/posude',
  'KS|KS-10|KS-10-05': 'kucni-setovi/kuhinjski-pribor/pepeljare',
  'KS|KS-10|KS-10-07': 'kucni-setovi/kuhinjski-pribor/otvaraci-za-flase',
  'KS|KS-10|KS-10-10': 'kucni-setovi/kuhinjski-pribor/magneti',
  'KS|KS-10|KS-10-13': 'kucni-setovi/kuhinjski-pribor/podmetaci',
  'KS|KS-13|KS-13-01': 'kucni-setovi/vinski-setovi',
  'KS|KS-16|KS-16-07': 'kucni-setovi/sport-i-zabava',
  'KS|KS-22|KS-22-01': 'kucni-setovi/lepota',
  'KS|KS-25|KS-25-05': 'kucni-setovi/zdravlje-i-zastita',
  'KS|KS-30|KS-30-01': 'kucni-setovi/upaljaci/plasticni-upaljaci',
  'KS|KS-30|KS-30-03': 'kucni-setovi/upaljaci/metalni-upaljaci',
  'KS|KS-30|KS-30-07': 'kucni-setovi/upaljaci/oprema-za-cigare',

  'OL|OL-01|OL-01-01': 'olovke/plasticne-olovke',
  'OL|OL-03|OL-03-01': 'olovke/metalne-olovke',
  'OL|OL-05|OL-05-01': 'olovke/setovi-olovaka',
  'OL|OL-09|OL-09-01': 'olovke/drvene-olovke',

  'PT|PT-01|PT-01-01': 'privesci-alati/privesci/metalni-privesci',
  'PT|PT-01|PT-01-03': 'privesci-alati/privesci/ostali-privesci',
  'PT|PT-01|PT-01-05': 'privesci-alati/privesci/drveni-privesci',
  'PT|PT-01|PT-01-07': 'privesci-alati/privesci/plasticni-privesci',
  'PT|PT-04|PT-04-01': 'privesci-alati/alati/rucni-alat',
  'PT|PT-04|PT-04-03': 'privesci-alati/alati/izvidjacka-oprema',
  'PT|PT-04|PT-04-05': 'privesci-alati/alati/lampe',
  'PT|PT-04|PT-04-07': 'privesci-alati/alati/merni-pribor',
  'PT|PT-04|PT-04-09': 'privesci-alati/alati/auto-oprema',

  'TP|TP-01|TP-01-01': 'torbe-putovanje/rancevi/sportski-rancevi',
  'TP|TP-01|TP-01-03': 'torbe-putovanje/rancevi/poslovni-rancevi',
  'TP|TP-04|TP-04-01': 'torbe-putovanje/torbe/konferencijske-torbe',
  'TP|TP-04|TP-04-03': 'torbe-putovanje/torbe/sportske-i-putne-torbe',
  'TP|TP-04|TP-04-07': 'torbe-putovanje/torbe/frizider-torbe',
  'TP|TP-07|TP-07-01': 'torbe-putovanje/putni-program',
  'TP|TP-10|TP-10-01': 'torbe-putovanje/kese/pp-kese',
  'TP|TP-10|TP-10-03': 'torbe-putovanje/kese/papirne-kese',
  'TP|TP-10|TP-10-05': 'torbe-putovanje/kese/pamucne-kese',
  'TP|TP-10|TP-10-09': 'torbe-putovanje/kese/juta-kese',
  'TP|TP-13|TP-13-01': 'torbe-putovanje/kisobrani/kisobrani',
  'TP|TP-13|TP-13-03': 'torbe-putovanje/kisobrani/sklopivi-kisobrani',

  'TX|TX-01|TX-01-01': 'tekstil/majice/unisex-majice',
  'TX|TX-01|TX-01-03': 'tekstil/majice/zenske-majice',
  'TX|TX-01|TX-01-05': 'tekstil/majice/decije-majice',
  'TX|TX-01|TX-01-07': 'tekstil/majice/sportske-majice',
  'TX|TX-04|TX-04-01': 'tekstil/polo-majice/unisex-polo-majice',
  'TX|TX-04|TX-04-03': 'tekstil/polo-majice/zenske-polo-majice',
  'TX|TX-07|TX-07-01': 'tekstil/sportska-oprema/duksarice',
  'TX|TX-07|TX-07-03': 'tekstil/sportska-oprema/donji-deo-trenerki',
  'TX|TX-07|TX-07-05': 'tekstil/sportska-oprema/sorcevi',
  'TX|TX-10|TX-10-01': 'tekstil/prsluci/radni-prsluci',
  'TX|TX-10|TX-10-03': 'tekstil/prsluci/stepani-prsluci',
  'TX|TX-10|TX-10-05': 'tekstil/prsluci/softshell-prsluci',
  'TX|TX-13|TX-13-01': 'tekstil/jakne/zimske-jakne-i-vetrovke',
  'TX|TX-13|TX-13-05': 'tekstil/jakne/softshell-jakne',
  'TX|TX-16|TX-16-01': 'tekstil/poslovna-oprema/kosulje',
  'TX|TX-16|TX-16-03': 'tekstil/poslovna-oprema/pantalone',
  'TX|TX-16|TX-16-05': 'tekstil/poslovna-oprema/kecelje-i-oprema',
  'TX|TX-16|TX-16-07': 'tekstil/poslovna-oprema/modni-dodaci',
  'TX|TX-19|TX-19-01': 'tekstil/peskiri',
  'TX|TX-25|TX-25-01': 'tekstil/kape/kacketi',
  'TX|TX-25|TX-25-03': 'tekstil/kape/sesiri',
  'TX|TX-25|TX-25-05': 'tekstil/kape/zimski-program',

  'UB|UB-01|UB-01-01': 'tehnologija/pomocne-baterije',
  'UB|UB-04|UB-04-01': 'tehnologija/audio-uredjaji/zvucnici',
  'UB|UB-04|UB-04-03': 'tehnologija/audio-uredjaji/slusalice-bubice',
  'UB|UB-04|UB-04-05': 'tehnologija/audio-uredjaji/slusalice',
  'UB|UB-07|UB-07-02': 'tehnologija/auto-oprema',
  'UB|UB-10|UB-10-05': 'tehnologija/gedzeti',
  'UB|UB-13|UB-13-05': 'tehnologija/usb/usb',
  'UB|UB-13|UB-13-11': 'tehnologija/usb/ssd',
  'UB|UB-16|UB-16-01': 'tehnologija/bezicni-punjaci',
  'UB|UB-19|UB-19-01': 'tehnologija/usb-kablovi',
  'UB|UB-22|UB-22-01': 'tehnologija/pametni-satovi',
  'UB|UB-24|UB-24-01': 'tehnologija/tech-portfolio',
  'UB|UB-27|UB-27-01': 'tehnologija/kompjuterska-oprema',

  'WW|WW-01|WW-01-01': 'radna-oprema/radna-odeca/radne-pantalone',
  'WW|WW-01|WW-01-03': 'radna-oprema/radna-odeca/radne-jakne',
  'WW|WW-01|WW-01-05': 'radna-oprema/radna-odeca/radne-bermude',
  'WW|WW-01|WW-01-07': 'radna-oprema/radna-odeca/radni-prsluci',
  'WW|WW-03|WW-03-01': 'radna-oprema/zastitna-obuca/sigurnosna-obuca',
  'WW|WW-03|WW-03-03': 'radna-oprema/zastitna-obuca/radna-obuca',
  'WW|WW-05|WW-05-01': 'radna-oprema/sigurnosna-odeca',
  'WW|WW-07|WW-07-01': 'radna-oprema/dodatna-radna-oprema',
};

// Falls back a level (GW1|GW2, then just GW1) if a specific leaf combo isn't
// in the table above - covers new products Promobox adds under an existing
// branch before this table gets a matching entry for its exact leaf.
const GROUPWEB_BRANCH = {
  'KA|KA-01': 'kancelarija/notesi-i-agende',
  'KA|KA-04': 'kancelarija/kancelarija',
  'KA|KA-07': 'kancelarija/satovi',
  'KA|KA-10': 'kancelarija/promo-pultovi-i-panoi',
  'KA|KA-13': 'kancelarija/poklon-kutije',
  'KS|KS-01': 'kucni-setovi/solje',
  'KS|KS-04': 'kucni-setovi/boce',
  'KS|KS-07': 'kucni-setovi/termosi',
  'KS|KS-10': 'kucni-setovi/kuhinjski-pribor',
  'KS|KS-13': 'kucni-setovi/vinski-setovi',
  'KS|KS-16': 'kucni-setovi/sport-i-zabava',
  'KS|KS-22': 'kucni-setovi/lepota',
  'KS|KS-25': 'kucni-setovi/zdravlje-i-zastita',
  'KS|KS-30': 'kucni-setovi/upaljaci',
  'OL|OL-01': 'olovke/plasticne-olovke',
  'OL|OL-03': 'olovke/metalne-olovke',
  'OL|OL-05': 'olovke/setovi-olovaka',
  'OL|OL-09': 'olovke/drvene-olovke',
  'PT|PT-01': 'privesci-alati/privesci',
  'PT|PT-04': 'privesci-alati/alati',
  'TP|TP-01': 'torbe-putovanje/rancevi',
  'TP|TP-04': 'torbe-putovanje/torbe',
  'TP|TP-07': 'torbe-putovanje/putni-program',
  'TP|TP-10': 'torbe-putovanje/kese',
  'TP|TP-13': 'torbe-putovanje/kisobrani',
  'TX|TX-01': 'tekstil/majice',
  'TX|TX-04': 'tekstil/polo-majice',
  'TX|TX-07': 'tekstil/sportska-oprema',
  'TX|TX-10': 'tekstil/prsluci',
  'TX|TX-13': 'tekstil/jakne',
  'TX|TX-16': 'tekstil/poslovna-oprema',
  'TX|TX-19': 'tekstil/peskiri',
  'TX|TX-25': 'tekstil/kape',
  'UB|UB-01': 'tehnologija/pomocne-baterije',
  'UB|UB-04': 'tehnologija/audio-uredjaji',
  'UB|UB-07': 'tehnologija/auto-oprema',
  'UB|UB-10': 'tehnologija/gedzeti',
  'UB|UB-13': 'tehnologija/usb',
  'UB|UB-16': 'tehnologija/bezicni-punjaci',
  'UB|UB-19': 'tehnologija/usb-kablovi',
  'UB|UB-22': 'tehnologija/pametni-satovi',
  'UB|UB-24': 'tehnologija/tech-portfolio',
  'UB|UB-27': 'tehnologija/kompjuterska-oprema',
  'WW|WW-01': 'radna-oprema/radna-odeca',
  'WW|WW-03': 'radna-oprema/zastitna-obuca',
  'WW|WW-05': 'radna-oprema/sigurnosna-odeca',
  'WW|WW-07': 'radna-oprema/dodatna-radna-oprema',
};

const GROUPWEB_MAIN = {
  KA: 'kancelarija',
  KS: 'kucni-setovi',
  OL: 'olovke',
  PT: 'privesci-alati',
  TP: 'torbe-putovanje',
  TX: 'tekstil',
  UB: 'tehnologija',
  WW: 'radna-oprema',
};

// Tracks GroupWeb combos that fell back to a broader level instead of
// hitting an exact leaf entry above - e.g. Promobox adding a new
// subcategory this table doesn't know about yet. Cleared and re-logged
// once per refreshProducts() cycle by productCache.js, so a stale miss
// from a since-discontinued product doesn't linger in the log forever.
const unmappedCombos = new Map();

export function classify({ groupWeb1, groupWeb2, groupWeb3 }) {
  if (!groupWeb1) return [];

  const leafKey = `${groupWeb1}|${groupWeb2}|${groupWeb3}`;
  if (GROUPWEB_LEAF[leafKey]) return n(GROUPWEB_LEAF[leafKey]);

  const branchKey = `${groupWeb1}|${groupWeb2}`;
  const fallback = GROUPWEB_BRANCH[branchKey] || GROUPWEB_MAIN[groupWeb1] || null;
  const existing = unmappedCombos.get(leafKey);
  if (existing) {
    existing.count += 1;
  } else {
    unmappedCombos.set(leafKey, { count: 1, fallback });
  }

  if (GROUPWEB_BRANCH[branchKey]) return n(GROUPWEB_BRANCH[branchKey]);
  if (GROUPWEB_MAIN[groupWeb1]) return n(GROUPWEB_MAIN[groupWeb1]);

  return [];
}

export function getUnmappedCombos() {
  return [...unmappedCombos.entries()].map(([combo, { count, fallback }]) => ({ combo, count, fallback }));
}

export function resetUnmappedCombos() {
  unmappedCombos.clear();
}

export function getTree() {
  return INDEXED_TREE;
}

export function getNode(id) {
  return NODES_BY_PATH.get(id) || null;
}
