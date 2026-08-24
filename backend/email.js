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

const PAYMENT_LABELS = {
  card: 'Platnom karticom',
  cash: 'Pouzećem u gotovini pri prijemu robe',
};

export function generateOrderNumber() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `WEB${Date.now().toString().slice(-6)}${random}`;
}

function formatDate(date) {
  return date.toLocaleString('sr-RS');
}

function money(amount) {
  return `€${Number(amount).toFixed(2)}`;
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

function buildOrderHtml({ orderNumber, createdAt, items, customer, paymentMethod, total }) {
  const itemsCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${item.code || ''}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${item.name}${
        [item.colorName, item.size].filter(Boolean).length
          ? ` (${[item.colorName, item.size].filter(Boolean).join(', ')})`
          : ''
      }</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${money(item.price)}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee; text-align: right;">${money(item.price * item.quantity)}</td>
    </tr>`,
    )
    .join('');

  return `
  <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
    ${infoTable([
      ['Broj porudžbine', orderNumber],
      ['Datum porudžbine', formatDate(createdAt)],
      ['Način isporuke', 'Poslati na navedenu adresu'],
      ['Način plaćanja', PAYMENT_LABELS[paymentMethod] || paymentMethod],
      ['Napomena', customer.note],
    ])}

    <h3 style="margin-bottom: 8px;">Informacije o kupcu:</h3>
    ${infoTable([
      ['Ime i Prezime', `${customer.firstName} ${customer.lastName}`],
      ['Adresa', customer.address],
      ['Dodatna adresa', customer.address2],
      ['Mesto', customer.city],
      ['Zip kod', customer.zip],
      ['Telefon', customer.phone],
      ['E-mail', customer.email],
    ])}

    <h3 style="margin-bottom: 8px;">Informacije o prodavcu:</h3>
    ${infoTable([
      ['Naziv prodavca', SELLER.name],
      ['Adresa', SELLER.address],
      ['Telefon', SELLER.phone],
      ['PIB', SELLER.pib],
      ['Šifra delatnosti', SELLER.activityCode],
      ['Žiro račun', SELLER.bankAccount],
      ['E-mail', SELLER.email],
    ])}

    <h3 style="margin-bottom: 8px;">Informacije o naručenim proizvodima:</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <thead>
        <tr style="text-align: left; border-bottom: 2px solid #111;">
          <th style="padding: 6px 12px;">Šifra</th>
          <th style="padding: 6px 12px;">Naziv proizvoda</th>
          <th style="padding: 6px 12px;">Cena</th>
          <th style="padding: 6px 12px;">Količina</th>
          <th style="padding: 6px 12px; text-align: right;">Ukupna cena</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <table style="border-collapse: collapse; margin-top: 8px;">
      <tr>
        <td style="padding: 3px 12px 3px 0; color: #555;">Cena artikala:</td>
        <td style="padding: 3px 0;">${money(itemsCost)}</td>
      </tr>
      <tr>
        <td style="padding: 3px 12px 3px 0; color: #555;">Troškovi isporuke:</td>
        <td style="padding: 3px 0;">Besplatno</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px 3px 0; font-weight: bold;">Ukupno:</td>
        <td style="padding: 6px 0 3px; font-weight: bold;">${money(total)}</td>
      </tr>
    </table>
  </div>`;
}

// Sends the order notification (to the shop) and the confirmation (to the
// customer). In sandbox mode (no verified domain yet), Resend only
// delivers to the account's own signup address, so ORDER_NOTIFICATION_EMAIL
// should be set to that for now - both emails are logged either way.
export async function sendOrderEmails(order) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set - skipping order emails');
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || 'WebShop <onboarding@resend.dev>';
  const html = buildOrderHtml(order);

  const notifyTo = process.env.ORDER_NOTIFICATION_EMAIL;
  if (notifyTo) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: notifyTo,
        subject: `Nova porudžbina ${order.orderNumber}`,
        html,
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
      subject: `Potvrda porudžbine ${order.orderNumber}`,
      html,
    });
    if (error) console.error('Failed to send customer confirmation email:', error.message);
  } catch (err) {
    console.error('Failed to send customer confirmation email:', err.message);
  }
}
