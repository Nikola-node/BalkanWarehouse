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
  { name: 'Kućni setovi', children: [
    { name: 'Šolje', children: [{ name: 'Keramičke šolje' }, { name: 'Staklene šolje' }, { name: 'Metalne šolje' }] },
    { name: 'Boce', children: [{ name: 'Metalne boce' }, { name: 'Staklene boce' }, { name: 'Plastične boce' }] },
    { name: 'Termosi' },
    { name: 'Kuhinjski pribor', children: [
      { name: 'Kuhinjski setovi' }, { name: 'Posude' }, { name: 'Pepeljare' },
      { name: 'Otvarači za flaše' }, { name: 'Magneti' }, { name: 'Podmetači' },
    ] },
    { name: 'Vinski setovi' },
    { name: 'Sport i zabava' },
    { name: 'Lepota' },
    { name: 'Zdravlje i zaštita' },
    { name: 'Upaljači', children: [{ name: 'Plastični upaljači' }, { name: 'Metalni upaljači' }, { name: 'Oprema za cigare' }] },
  ] },
  { name: 'Tehnologija', children: [
    { name: 'Pomoćne baterije' },
    { name: 'Audio uređaji', children: [{ name: 'Zvučnici' }, { name: 'Slušalice' }, { name: 'Slušalice bubice' }] },
    { name: 'Auto oprema' },
    { name: 'Gedžeti' },
    { name: 'USB', children: [{ name: 'USB' }, { name: 'SSD' }] },
    { name: 'Bežični punjači' },
    { name: 'USB kablovi' },
    { name: 'Pametni satovi' },
    { name: 'Tech portfolio' },
    { name: 'Kompjuterska oprema' },
  ] },
  { name: 'Kancelarija', children: [
    { name: 'Notesi i agende', children: [{ name: 'Notesi' }, { name: 'Agende' }, { name: 'Portfolio' }] },
    { name: 'Kancelarija', children: [
      { name: 'Setovi za beleške' }, { name: 'Vizitari' }, { name: 'Kancelarijski pribor' },
      { name: 'Školski pribor' }, { name: 'Držači za ID kartice' }, { name: 'Stone lampe' },
    ] },
    { name: 'Satovi' },
    { name: 'Promo pultovi i panoi' },
    { name: 'Poklon kutije' },
  ] },
  { name: 'Olovke', children: [{ name: 'Plastične olovke' }, { name: 'Metalne olovke' }, { name: 'Setovi olovaka' }, { name: 'Drvene olovke' }] },
  { name: 'Privesci & Alati', children: [
    { name: 'Privesci', children: [{ name: 'Metalni privesci' }, { name: 'Plastični privesci' }, { name: 'Drveni privesci' }, { name: 'Ostali privesci' }] },
    { name: 'Alati', children: [{ name: 'Ručni alat' }, { name: 'Izviđačka oprema' }, { name: 'Lampe' }, { name: 'Merni pribor' }, { name: 'Auto oprema' }] },
  ] },
  { name: 'Torbe & Putovanje', children: [
    { name: 'Rančevi', children: [{ name: 'Sportski rančevi' }, { name: 'Poslovni rančevi' }] },
    { name: 'Torbe', children: [{ name: 'Konferencijske torbe' }, { name: 'Sportske i putne torbe' }, { name: 'Frižider torbe' }] },
    { name: 'Putni program' },
    { name: 'Kese', children: [{ name: 'PP kese' }, { name: 'Papirne kese' }, { name: 'Pamučne kese' }, { name: 'Juta kese' }] },
    { name: 'Kišobrani', children: [{ name: 'Kišobrani' }, { name: 'Sklopivi kišobrani' }] },
  ] },
  { name: 'Tekstil', children: [
    { name: 'Majice', children: [{ name: 'Unisex majice' }, { name: 'Ženske majice' }, { name: 'Dečije majice' }, { name: 'Sportske majice' }] },
    { name: 'Polo majice', children: [{ name: 'Unisex polo majice' }, { name: 'Ženske polo majice' }] },
    { name: 'Sportska oprema', children: [{ name: 'Duksarice' }, { name: 'Donji deo trenerki' }, { name: 'Šorcevi' }] },
    { name: 'Prsluci', children: [{ name: 'Radni prsluci' }, { name: 'Štepani prsluci' }, { name: 'Softshell prsluci' }] },
    { name: 'Jakne', children: [{ name: 'Zimske jakne i vetrovke' }, { name: 'Softshell jakne' }] },
    { name: 'Poslovna oprema', children: [{ name: 'Košulje' }, { name: 'Pantalone' }, { name: 'Kecelje i oprema' }, { name: 'Modni dodaci' }] },
    { name: 'Peškiri' },
    { name: 'Kape', children: [{ name: 'Kačketi' }, { name: 'Šeširi' }, { name: 'Zimski program' }] },
  ] },
  { name: 'Radna oprema', children: [
    { name: 'Radna odeća', children: [{ name: 'Radne pantalone' }, { name: 'Radne jakne' }, { name: 'Radne bermude' }, { name: 'Radni prsluci' }] },
    { name: 'Zaštitna obuća', children: [{ name: 'Sigurnosna obuća' }, { name: 'Radna obuća' }] },
    { name: 'Sigurnosna odeća' },
    { name: 'Dodatna radna oprema' },
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
      const built = { id: path.join('/'), name: node.name, path, children };
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

// --- Classification rules, grouped by the product's real Promobox Category
// code. Each rule is tested in order against the lowercased product name;
// the first match wins. If nothing matches, the product falls back to the
// listed default path (usually just the new main category, sometimes a
// level-2 node) so it's still browsable, just not filterable to a leaf.

function classifyKS(name) {
  if (/vinski set|poklon kutija za flašu/.test(name)) return n('kucni-setovi/vinski-setovi');
  if (/pepeljar/.test(name)) return n('kucni-setovi/kuhinjski-pribor/pepeljare');
  if (/otvarač za flaš/.test(name)) return n('kucni-setovi/kuhinjski-pribor/otvaraci-za-flase');
  if (/magnet/.test(name)) return n('kucni-setovi/kuhinjski-pribor/magneti');
  if (/podmetač|podloga za sublimaciju/.test(name)) return n('kucni-setovi/kuhinjski-pribor/podmetaci');
  if (/termos/.test(name)) return n('kucni-setovi/termosi');
  if (/šolj|čaš\w* za (espresso|cappuccino)|keramička činija/.test(name)) {
    if (/metaln/.test(name)) return n('kucni-setovi/solje/metalne-solje');
    if (/staklen/.test(name)) return n('kucni-setovi/solje/staklene-solje');
    return n('kucni-setovi/solje/keramicke-solje');
  }
  if (/čaša za poneti/.test(name)) return n('kucni-setovi/boce/plasticne-boce');
  if (/pljosk/.test(name)) return n('kucni-setovi/boce/metalne-boce');
  if (/boca/.test(name)) {
    if (/metaln/.test(name)) return n('kucni-setovi/boce/metalne-boce');
    if (/staklen/.test(name)) return n('kucni-setovi/boce/staklene-boce');
    return n('kucni-setovi/boce/plasticne-boce');
  }
  if (/set (drvena|kamena|podmetača|za so|za ulje|pribora za sir)|set sa keramičkim posudama|mlin za so|daska za sečenje/.test(name)) {
    return n('kucni-setovi/kuhinjski-pribor/kuhinjski-setovi');
  }
  if (/posuda za hranu/.test(name)) return n('kucni-setovi/kuhinjski-pribor/posude');
  return n('kucni-setovi');
}

function classifyRL(subCategory) {
  if (subCategory === 'RL - 01' || subCategory === 'RL - 02') return n('kucni-setovi/sport-i-zabava');
  if (subCategory === 'RL - 03') return n('kucni-setovi/lepota');
  if (subCategory === 'RL - 04' || subCategory === 'RL - 05') return n('kucni-setovi/zdravlje-i-zastita');
  return n('kucni-setovi');
}

function classifyUP(name) {
  if (/metaln\w* (upaljač|kremen)|brener metalni/.test(name)) return n('kucni-setovi/upaljaci/metalni-upaljaci');
  if (/šibic/.test(name)) return n('kucni-setovi/upaljaci/oprema-za-cigare');
  return n('kucni-setovi/upaljaci/plasticni-upaljaci');
}

function classifyTE(name) {
  if (/pomoćn\w* baterij|power ?bank/.test(name)) return n('tehnologija/pomocne-baterije');
  if (/slušalic/.test(name)) return n('tehnologija/audio-uredjaji/slusalice');
  if (/zvučnik/.test(name)) return n('tehnologija/audio-uredjaji/zvucnici');
  if (/pametni sat/.test(name)) return n('tehnologija/pametni-satovi');
  if (/za automobil/.test(name)) return n('tehnologija/auto-oprema');
  if (/bežičn\w* punjač/.test(name)) return n('tehnologija/bezicni-punjaci');
  if (/usb.*kabl|type-c kabl|razdelnik|zidni punjač|multiadapter|\badapter\b/.test(name)) return n('tehnologija/usb-kablovi');
  if (/podloga za kompjuterskog miša|bežični miš|tastatura/.test(name)) return n('tehnologija/kompjuterska-oprema');
  return n('tehnologija/gedzeti');
}

function classifyUB(name) {
  if (/ssd/.test(name)) return n('tehnologija/usb/ssd');
  if (/usb flash memorija/.test(name)) return n('tehnologija/usb/usb');
  if (/poklon kutija|navlaka za usb/.test(name)) return n('kancelarija/poklon-kutije');
  return n('tehnologija/usb');
}

function classifyKA(name) {
  if (/led stona lampa|stona lampa|magnetna levitirajuća lampa|magična plazma sfera lampa/.test(name)) {
    return n('kancelarija/kancelarija/stone-lampe');
  }
  if (/set za beleške|set za pisanje i crtanje/.test(name)) return n('kancelarija/kancelarija/setovi-za-beleske');
  if (/notes sa olovkom|set za crtanje|set za bojenje|bojanka|drvene bojice|voštane bojice/.test(name)) {
    return n('kancelarija/kancelarija/skolski-pribor');
  }
  if (/novčanik|držač za kartice/.test(name)) return n('kancelarija/kancelarija/drzaci-za-id-kartice');
  if (/vizitar/.test(name)) return n('kancelarija/kancelarija/vizitari');
  if (/aluminijumski reklamni|plastični reklamni pult|sklopiva stolica/.test(name)) return n('kancelarija/promo-pultovi-i-panoi');
  if (/digitalni stoni lcd sat|drveni zidni sat/.test(name)) return n('kancelarija/satovi');
  if (/poklon kutija/.test(name)) return n('kancelarija/poklon-kutije');
  if (/držač (za )?mobilnih uređaja|mikrofiber krpica|futrola za pure krpicu|pure krpica/.test(name)) return n('tehnologija/gedzeti');
  return n('kancelarija/kancelarija/kancelarijski-pribor');
}

function classifyRK(name) {
  if (/portfolio/.test(name)) return n('kancelarija/notesi-i-agende/portfolio');
  if (/rokovnik/.test(name)) return n('kancelarija/notesi-i-agende/agende');
  if (/notes/.test(name)) return n('kancelarija/notesi-i-agende/notesi');
  return n('kancelarija/notesi-i-agende');
}

function classifyOL(subCategory) {
  if (subCategory === 'OL - 01') return n('olovke/plasticne-olovke');
  if (subCategory === 'OL - 02') return n('olovke/metalne-olovke');
  if (subCategory === 'OL - 03') return n('olovke/drvene-olovke');
  if (subCategory === 'OL - 04') return n('olovke/setovi-olovaka');
  return n('olovke');
}

function classifyPT(name, subCategory) {
  if (subCategory === 'PT - 02') return n('privesci-alati/privesci/ostali-privesci');
  if (/wood|drven/.test(name)) return n('privesci-alati/privesci/drveni-privesci');
  if (/metaln/.test(name)) return n('privesci-alati/privesci/metalni-privesci');
  return n('privesci-alati/privesci/plasticni-privesci');
}

function classifyAO(name, subCategory) {
  if (subCategory === 'AO - 01') return n('privesci-alati/alati/lampe');
  if (subCategory === 'AO - 04') return n('privesci-alati/alati/merni-pribor');
  if (subCategory === 'AO - 02') return n('privesci-alati/alati/izvidjacka-oprema');
  if (/ručn\w* alat|odvijač/.test(name)) return n('privesci-alati/alati/rucni-alat');
  return n('privesci-alati/alati/auto-oprema');
}

function classifyTP(name) {
  if (/frižider torb/.test(name)) return n('torbe-putovanje/torbe/frizider-torbe');
  if (/sportsk\w* torb/.test(name)) return n('torbe-putovanje/torbe/sportske-i-putne-torbe');
  if (/konferencijsk\w* torb|laptop torb|kozmetičk\w* torb/.test(name)) return n('torbe-putovanje/torbe/konferencijske-torbe');
  if (/papirna kesa/.test(name)) return n('torbe-putovanje/kese/papirne-kese');
  if (/pamučn\w* (torb|ranac)|recikliranog pamuka|kanvas/.test(name)) return n('torbe-putovanje/kese/pamucne-kese');
  if (/jut/.test(name)) return n('torbe-putovanje/kese/juta-kese');
  if (/poslovni ranac/.test(name)) return n('torbe-putovanje/rancevi/poslovni-rancevi');
  if (/ranac/.test(name)) return n('torbe-putovanje/rancevi/sportski-rancevi');
  if (/identifikaciona kartica|navlaka za pasoš|jastuk za putovanje|jastuk od memorijske pene|putni set|putni kofer/.test(name)) {
    return n('torbe-putovanje/putni-program');
  }
  if (/torba/.test(name)) return n('torbe-putovanje/kese/pp-kese');
  return n('torbe-putovanje');
}

function classifyKI(name) {
  if (/sklopiv\w* kišobran/.test(name)) return n('torbe-putovanje/kisobrani/sklopivi-kisobrani');
  return n('torbe-putovanje/kisobrani/kisobrani');
}

function classifyTX(name) {
  if (/zaštitn\w* cipel|radne? patik|(plitk|dubok)\w* (radn|zaštitn)\w* cipel/.test(name)) return n('radna-oprema/zastitna-obuca/sigurnosna-obuca');
  if (/zaštitn\w* rukavic|rukavice za jednokratnu|zaštitni šlem|\bhelmet\b|radn\w* kaiš|radne čarape/.test(name)) return n('radna-oprema/dodatna-radna-oprema');
  if (/sigurnosn\w* (prsluk|.*jakna|.*odeć)|hi-?viz/.test(name)) return n('radna-oprema/sigurnosna-odeca');
  if (/polukombinezon/.test(name)) return n('radna-oprema/radna-odeca/radne-pantalone');
  if (/radn\w* berm|servisn\w* radn\w* berm/.test(name)) return n('radna-oprema/radna-odeca/radne-bermude');
  if (/radn\w* (jakna|bluza)/.test(name)) return n('radna-oprema/radna-odeca/radne-jakne');
  if (/radn\w* prsluk/.test(name)) return n('radna-oprema/radna-odeca/radni-prsluci');
  if (/(radn\w*|servisn\w* radn\w*) pantalon/.test(name)) return n('radna-oprema/radna-odeca/radne-pantalone');

  if (/peškir|ćebence|mikrofiber/.test(name)) return n('tekstil/peskiri');
  if (/kačket|vizir kačket/.test(name)) return n('tekstil/kape/kacketi');
  if (/šeš(i|e)r/.test(name)) return n('tekstil/kape/sesiri');
  if (/zimsk\w* (kapa|šal)|\bšal\b/.test(name)) return n('tekstil/kape/zimski-program');
  if (/kecelj/.test(name)) return n('tekstil/poslovna-oprema/kecelje-i-oprema');
  if (/košulj/.test(name)) return n('tekstil/poslovna-oprema/kosulje');
  if (/touch.*prsta/.test(name)) return n('tekstil/poslovna-oprema/modni-dodaci');
  if (/softshell.*jakn/.test(name)) return n('tekstil/jakne/softshell-jakne');
  if (/softshell.*prsluk/.test(name)) return n('tekstil/prsluci/softshell-prsluci');
  if (/jakn|vetrovk/.test(name)) return n('tekstil/jakne/zimske-jakne-i-vetrovke');
  if (/prsluk/.test(name)) return n('tekstil/prsluci/stepani-prsluci');
  if (/polo majic/.test(name)) {
    return /žensk|lady/.test(name) ? n('tekstil/polo-majice/zenske-polo-majice') : n('tekstil/polo-majice/unisex-polo-majice');
  }
  if (/dukseric|hoody/.test(name)) return n('tekstil/sportska-oprema/duksarice');
  if (/donji deo trenerk/.test(name)) return n('tekstil/sportska-oprema/donji-deo-trenerki');
  if (/šorts/.test(name)) return n('tekstil/sportska-oprema/sorcevi');
  if (/pantalon/.test(name)) return n('tekstil/poslovna-oprema/pantalone');
  if (/sportsk\w* majic|majica.*raglan/.test(name)) return n('tekstil/majice/sportske-majice');
  if (/majic/.test(name)) {
    if (/dečj|kid/.test(name)) return n('tekstil/majice/decije-majice');
    if (/žensk|lady/.test(name)) return n('tekstil/majice/zenske-majice');
    return n('tekstil/majice/unisex-majice');
  }
  return n('tekstil');
}

export function classify(product) {
  const name = product.name.toLowerCase();
  switch (product.category) {
    case 'KS': return classifyKS(name);
    case 'RL': return classifyRL(product.subCategory);
    case 'UP': return classifyUP(name);
    case 'TE': return classifyTE(name);
    case 'UB': return classifyUB(name);
    case 'KA': return classifyKA(name);
    case 'RK': return classifyRK(name);
    case 'OL': return classifyOL(product.subCategory);
    case 'PT': return classifyPT(name, product.subCategory);
    case 'AO': return classifyAO(name, product.subCategory);
    case 'TP': return classifyTP(name);
    case 'KI': return classifyKI(name);
    case 'TX': return classifyTX(name);
    default: return [];
  }
}

export function getTree() {
  return INDEXED_TREE;
}

export function getNode(id) {
  return NODES_BY_PATH.get(id) || null;
}
