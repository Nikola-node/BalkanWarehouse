import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// MEDONI's own business info, shown as the seller block on every order
// email - matches the format used on tshirtshop.rs's real order emails.
const SELLER = {
  name: 'MEDONI',
  address: 'Kneza Višeslava 63, TC Vidikovac Lokal/1.43',
  phone: '+38162625111',
  pib: '111829034',
  activityCode: '4690',
  bankAccount: '160-6000000045353-81',
  email: 'office@tshirtshop.rs',
};

// Only the email template's own static labels are translated - item names
// stay in whatever language they were added to the cart in, the same way
// the rest of the site keeps product text as-is across a language switch.
const STRINGS = {
  sr: {
    orderNotificationSubject: (n) => `Nova porudžbina ${n}`,
    orderConfirmationSubject: (n) => `Potvrda porudžbine ${n}`,
    orderNumber: 'Broj porudžbine',
    orderDate: 'Datum porudžbine',
    deliveryMethod: 'Način isporuke',
    deliveryToAddress: 'Poslati na navedenu adresu',
    paymentMethod: 'Način plaćanja',
    note: 'Napomena',
    payByCard: 'Platnom karticom',
    payByCash: 'Pouzećem u gotovini pri prijemu robe',
    customerInfo: 'Informacije o kupcu:',
    fullName: 'Ime i Prezime',
    address: 'Adresa',
    address2: 'Dodatna adresa',
    city: 'Mesto',
    zip: 'Zip kod',
    phone: 'Telefon',
    email: 'E-mail',
    sellerInfo: 'Informacije o prodavcu:',
    sellerName: 'Naziv prodavca',
    pib: 'PIB',
    activityCode: 'Šifra delatnosti',
    bankAccount: 'Žiro račun',
    productsInfo: 'Informacije o naručenim proizvodima:',
    code: 'Šifra',
    productName: 'Naziv proizvoda',
    price: 'Cena',
    quantity: 'Količina',
    lineTotal: 'Ukupna cena',
    itemsCost: 'Cena artikala:',
    deliveryCost: 'Troškovi isporuke:',
    total: 'Ukupno:',
    locale: 'sr-RS',
  },
  en: {
    orderNotificationSubject: (n) => `New order ${n}`,
    orderConfirmationSubject: (n) => `Order confirmation ${n}`,
    orderNumber: 'Order number',
    orderDate: 'Order date',
    deliveryMethod: 'Delivery method',
    deliveryToAddress: 'Ship to the given address',
    paymentMethod: 'Payment method',
    note: 'Note',
    payByCard: 'By card',
    payByCash: 'Cash on delivery',
    customerInfo: 'Customer information:',
    fullName: 'Full name',
    address: 'Address',
    address2: 'Additional address',
    city: 'City',
    zip: 'Postal code',
    phone: 'Phone',
    email: 'Email',
    sellerInfo: 'Seller information:',
    sellerName: 'Seller name',
    pib: 'Tax ID (PIB)',
    activityCode: 'Activity code',
    bankAccount: 'Bank account',
    productsInfo: 'Ordered products:',
    code: 'Code',
    productName: 'Product name',
    price: 'Price',
    quantity: 'Quantity',
    lineTotal: 'Line total',
    itemsCost: 'Items cost:',
    deliveryCost: 'Delivery cost:',
    total: 'Total:',
    locale: 'en-US',
  },
};

export function generateOrderNumber() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `WEB${Date.now().toString().slice(-6)}${random}`;
}

// `amountEur` is always the EUR figure the site actually stores - `rate`
// (1 EUR in RSD) converts it for display here, rounded to the whole dinar
// since RSD has no smaller unit in practice.
function toRsd(amountEur, rate) {
  return Math.round(Number(amountEur) * rate);
}

function formatRsd(rsdAmount, locale) {
  return `${rsdAmount.toLocaleString(locale)} din`;
}

function infoTable(rows) {
  return `
    <table style="border-collapse: collapse; margin-bottom: 20px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 3px 12px 3px 0; color: #555; white-space: nowrap;">${label}:</td>
          <td style="padding: 3px 0;">${value || ''}</td>
        </tr>`,
        )
        .join('')}
    </table>`;
}

function buildOrderHtml({ orderNumber, createdAt, items, customer, paymentMethod, eurToRsdRate, deliveryCostRsd }, lang) {
  const t = STRINGS[lang] || STRINGS.sr;
  const paymentLabels = { card: t.payByCard, cash: t.payByCash };

  // Each line's total is the *displayed* unit price (already rounded to
  // RSD) times the quantity, not the raw EUR total rounded once at the end
  // - otherwise "310 din" times 50 wouldn't match the total shown below it,
  // the same rounding mismatch the site's own cart page had to fix.
  let itemsCostRsd = 0;
  const itemRows = items
    .map((item) => {
      const unitRsd = toRsd(item.price, eurToRsdRate);
      const lineTotalRsd = unitRsd * item.quantity;
      itemsCostRsd += lineTotalRsd;
      return `
    <tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${item.code || ''}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${item.name}${
        [item.colorName, item.size].filter(Boolean).length
          ? ` (${[item.colorName, item.size].filter(Boolean).join(', ')})`
          : ''
      }</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${formatRsd(unitRsd, t.locale)}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee; text-align: right;">${formatRsd(lineTotalRsd, t.locale)}</td>
    </tr>`;
    })
    .join('');

  return `
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
    ${infoTable([
      [t.orderNumber, orderNumber],
      [t.orderDate, createdAt.toLocaleString(t.locale)],
      [t.deliveryMethod, t.deliveryToAddress],
      [t.paymentMethod, paymentLabels[paymentMethod] || paymentMethod],
      [t.note, customer.note],
    ])}

    <h3 style="margin-bottom: 8px;">${t.customerInfo}</h3>
    ${infoTable([
      [t.fullName, `${customer.firstName} ${customer.lastName}`],
      [t.address, customer.address],
      [t.address2, customer.address2],
      [t.city, customer.city],
      [t.zip, customer.zip],
      [t.phone, customer.phone],
      [t.email, customer.email],
    ])}

    <h3 style="margin-bottom: 8px;">${t.sellerInfo}</h3>
    ${infoTable([
      [t.sellerName, SELLER.name],
      [t.address, SELLER.address],
      [t.phone, SELLER.phone],
      [t.pib, SELLER.pib],
      [t.activityCode, SELLER.activityCode],
      [t.bankAccount, SELLER.bankAccount],
      [t.email, SELLER.email],
    ])}

    <h3 style="margin-bottom: 8px;">${t.productsInfo}</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <thead>
        <tr style="text-align: left; border-bottom: 2px solid #111;">
          <th style="padding: 6px 12px;">${t.code}</th>
          <th style="padding: 6px 12px;">${t.productName}</th>
          <th style="padding: 6px 12px;">${t.price}</th>
          <th style="padding: 6px 12px;">${t.quantity}</th>
          <th style="padding: 6px 12px; text-align: right;">${t.lineTotal}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <table style="border-collapse: collapse; margin-top: 8px;">
      <tr>
        <td style="padding: 3px 12px 3px 0; color: #555;">${t.itemsCost}</td>
        <td style="padding: 3px 0;">${formatRsd(itemsCostRsd, t.locale)}</td>
      </tr>
      <tr>
        <td style="padding: 3px 12px 3px 0; color: #555;">${t.deliveryCost}</td>
        <td style="padding: 3px 0;">${formatRsd(deliveryCostRsd, t.locale)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px 3px 0; font-weight: bold;">${t.total}</td>
        <td style="padding: 6px 0 3px; font-weight: bold;">${formatRsd(itemsCostRsd + deliveryCostRsd, t.locale)}</td>
      </tr>
    </table>
  </div>`;
}

// Sends the order notification (to the shop, always in Serbian - that's
// who's reading it) and the confirmation (to the customer, in whatever
// language their site was in when they ordered). In sandbox mode (no
// verified domain yet), Resend only delivers to the account's own signup
// address, so ORDER_NOTIFICATION_EMAIL should be set to that for now -
// both emails are logged either way.
export async function sendOrderEmails(order) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set - skipping order emails');
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || 'BalkanWarehouse <onboarding@resend.dev>';
  const customerLang = order.customerLang === 'en' ? 'en' : 'sr';

  const notifyTo = process.env.ORDER_NOTIFICATION_EMAIL;
  if (notifyTo) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: notifyTo,
        subject: STRINGS.sr.orderNotificationSubject(order.orderNumber),
        html: buildOrderHtml(order, 'sr'),
      });
      if (error) console.error('Failed to send order notification email:', error.message);
    } catch (err) {
      console.error('Failed to send order notification email:', err.message);
    }
  } else {
    console.warn('ORDER_NOTIFICATION_EMAIL not set - skipping shop notification email');
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: order.customer.email,
      subject: STRINGS[customerLang].orderConfirmationSubject(order.orderNumber),
      html: buildOrderHtml(order, customerLang),
    });
    if (error) console.error('Failed to send customer confirmation email:', error.message);
  } catch (err) {
    console.error('Failed to send customer confirmation email:', err.message);
  }
}
