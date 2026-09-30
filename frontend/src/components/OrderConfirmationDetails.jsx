import { useEffect, useState } from 'react'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'
import { useCurrency } from '../CurrencyContext'

// The 5-element "Potvrda o plaćanju" Banca Intesa's EPM standard requires
// be shown on the confirmation page itself (Uputstvo, 2.7) - not just
// emailed, which is the only place this used to appear. Shared between the
// card-payment result page and the cash-order success view so both satisfy
// the same requirement from one implementation.
function OrderConfirmationDetails({ orderNumber, showTransaction }) {
  const [order, setOrder] = useState(null)
  const { formatPrice, formatLineTotal, formatRsd, toRsdInclVat } = useCurrency()

  useEffect(() => {
    if (!orderNumber) return
    fetch(`${BACKEND_URL}/api/orders/${encodeURIComponent(orderNumber)}/confirmation`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setOrder)
      .catch(() => {})
  }, [orderNumber])

  if (!order) return null

  const { customer, items, deliveryCostRsd, seller, payment } = order
  const itemsCostRsd = items.reduce((sum, item) => sum + toRsdInclVat(item.price) * item.quantity, 0)
  const grandTotalRsd = Math.round((itemsCostRsd + deliveryCostRsd) * 100) / 100

  return (
    <div className="order-confirmation">
      {showTransaction && payment && (
        <p className="order-confirmation-outcome">
          {payment.response === 'Approved' ? t('paymentApproved') : t('paymentDeclined')}
        </p>
      )}

      <div className="order-confirmation-section">
        <h3>{t('confirmationCustomerInfo')}</h3>
        <p>
          {customer.firstName} {customer.lastName}
        </p>
        <p>{customer.email}</p>
        <p>
          {customer.address}
          {customer.address2 ? `, ${customer.address2}` : ''}, {customer.city} {customer.zip}
        </p>
      </div>

      <div className="order-confirmation-section">
        <h3>{t('confirmationOrderInfo')}</h3>
        <p>
          {t('orderNumber')}: {order.orderNumber}
        </p>
        <p>
          {t('orderDate')}: {new Date(order.createdAt).toLocaleString('sr-RS')}
        </p>
        <table className="order-confirmation-items">
          <thead>
            <tr>
              <th>{t('code')}</th>
              <th>{t('productName')}</th>
              <th>{t('price')}</th>
              <th>{t('quantity')}</th>
              <th>{t('lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.code}</td>
                <td>
                  {item.name}
                  {[item.colorName, item.size].filter(Boolean).length
                    ? ` (${[item.colorName, item.size].filter(Boolean).join(', ')})`
                    : ''}
                </td>
                <td>{formatPrice(item.price)}</td>
                <td>{item.quantity}</td>
                <td>{formatLineTotal(item.price, item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          {t('deliveryCost')} {formatRsd(deliveryCostRsd)}
        </p>
        <p>
          <strong>
            {t('total')}: {formatRsd(grandTotalRsd)}
          </strong>
        </p>
      </div>

      <div className="order-confirmation-section">
        <h3>{t('confirmationSellerInfo')}</h3>
        <p>{seller.name}</p>
        <p>
          {t('pib')}: {seller.pib}
        </p>
        <p>{seller.address}</p>
      </div>

      {showTransaction && payment && (
        <div className="order-confirmation-section">
          <h3>{t('confirmationTransactionInfo')}</h3>
          <p>
            {t('orderNumber')} (order ID): {payment.oid}
          </p>
          <p>
            {t('authCode')}: {payment.authCode}
          </p>
          <p>
            {t('transId')}: {payment.transId}
          </p>
          <p>
            {t('response')}: {payment.response}
          </p>
          <p>
            {t('procReturnCode')}: {payment.procReturnCode}
          </p>
          <p>
            {t('mdStatus')}: {payment.mdStatus}
          </p>
          <p>
            {t('transactionDate')}: {payment.transactionDate}
          </p>
        </div>
      )}
    </div>
  )
}

export default OrderConfirmationDetails
