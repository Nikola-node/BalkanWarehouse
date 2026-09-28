import crypto from 'crypto';

// NestPay escapes "\" first, then "|", inside each field before joining them
// with "|" - otherwise a stray pipe inside a value (e.g. an order id) would
// be indistinguishable from a field separator.
function escapeField(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function sha512Base64(plainText) {
  return crypto.createHash('sha512').update(plainText, 'utf8').digest('base64');
}

// Builds the exact field set NestPay's 3D Pay Hosting gateway expects,
// including the request hash - `storeKey` is only ever used here, server
// side, to compute the hash, and is never itself sent to NestPay or to the
// browser.
export function buildPaymentFields({
  clientId,
  oid,
  amount,
  okUrl,
  failUrl,
  currency,
  lang,
  storeKey,
  installment = '',
}) {
  const trantype = 'PreAuth'; // DMS - required for goods only usable after delivery (see 2.4 of the bank's standards doc)
  const rnd = crypto.randomBytes(16).toString('hex');

  // Exact field order from the bank's own hash formula:
  // clientid|oid|amount|okurl|failurl|type|installment|rnd||||currency|storeKey
  const plainText = [
    escapeField(clientId),
    escapeField(oid),
    escapeField(amount),
    escapeField(okUrl),
    escapeField(failUrl),
    escapeField(trantype),
    escapeField(installment),
    escapeField(rnd),
    '',
    '',
    '',
    escapeField(currency),
    escapeField(storeKey),
  ].join('|');

  const hash = sha512Base64(plainText);

  return {
    clientid: clientId,
    amount,
    oid,
    okUrl,
    failUrl,
    TranType: trantype,
    Instalment: installment,
    currency,
    rnd,
    hash,
    storetype: '3d_pay_hosting',
    hashAlgorithm: 'ver2',
    lang,
    encoding: 'utf-8',
  };
}

// Confirms a callback (okUrl/failUrl POST) genuinely came from NestPay,
// rather than trusting the Response field on its own - recomputes the hash
// from the HASHPARAMSVAL NestPay itself sent back plus our StoreKey, and
// compares it to the HASH field they posted alongside it. This is the exact
// method the bank's own integration manual (3.3 Hash Checking) recommends,
// rather than reconstructing the field list and order ourselves.
export function verifyResponseHash(body, storeKey) {
  if (!body?.HASHPARAMSVAL || !body?.HASH) return false;
  const expected = sha512Base64(`${body.HASHPARAMSVAL}|${storeKey}`);
  return expected === body.HASH;
}

function extractXmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : '';
}

// The DMS follow-up actions (capture/void/refund) use a completely separate
// API from the payment redirect above - a direct server-to-server XML
// request authenticated with the Merchant Center username/password (not the
// StoreKey), since by this point there's no browser/hash exchange left to
// do, just "settle (or cancel) the reservation for this order".
async function callTransactionApi(type, orderId) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CC5Request>
  <Name>${process.env.NESTPAY_TEST_USERNAME}</Name>
  <Password>${process.env.NESTPAY_TEST_PASSWORD}</Password>
  <ClientId>${process.env.NESTPAY_TEST_CLIENT_ID}</ClientId>
  <Type>${type}</Type>
  <OrderId>${orderId}</OrderId>
</CC5Request>`;

  const apiUrl = process.env.NESTPAY_TEST_API_URL || 'https://testsecurepay.eway2pay.com/fim/api';
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `DATA=${encodeURIComponent(xml)}`,
  });
  const text = await res.text();

  return {
    response: extractXmlTag(text, 'Response'),
    authCode: extractXmlTag(text, 'AuthCode'),
    procReturnCode: extractXmlTag(text, 'ProcReturnCode'),
    transId: extractXmlTag(text, 'TransId'),
    errMsg: extractXmlTag(text, 'ErrMsg'),
  };
}

// Settles a preAuth'd (reserved) payment - the actual charge only happens
// now, meant to be triggered once an order genuinely ships, never before
// (see 2.4 of the bank's standards doc).
export function capturePayment(orderId) {
  return callTransactionApi('PostAuth', orderId);
}

// Releases a preAuth'd reservation without ever charging the customer -
// for an order that's cancelled before it ships.
export function voidPayment(orderId) {
  return callTransactionApi('Void', orderId);
}

// Reverses a payment that was already captured/settled.
export function refundPayment(orderId) {
  return callTransactionApi('Credit', orderId);
}
