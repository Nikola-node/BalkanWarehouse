import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useCart } from '../CartContext'
import { t } from '../i18n'

// Landed on after NestPay redirects the browser back from its hosted
// payment page - `success` picks which of the two outcomes to show. The
// cart is only cleared on a real success, so a failed/cancelled payment
// leaves it intact for the customer to simply try again.
function OrderResult({ success }) {
  const [params] = useSearchParams()
  const orderNumber = params.get('order')
  const { clearCart } = useCart()

  useEffect(() => {
    // Landed on via a multi-hop redirect (browser -> NestPay -> our backend
    // -> here), not a same-tab click - explicit regardless of outcome
    // rather than trusting that chain to always leave scroll at 0.
    window.scrollTo(0, 0)
    if (success) {
      clearCart()
      Swal.fire({
        icon: 'info',
        title: t('printNoticeTitle'),
        text: t('printNoticeBody'),
        showCloseButton: true,
        confirmButtonText: 'OK',
        confirmButtonColor: '#111111',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success])

  return (
    <div className="cart-empty">
      <h1>{success ? t('cardPaymentSuccessTitle') : t('cardPaymentFailedTitle')}</h1>
      <p>{success ? t('cardPaymentSuccessBody') : t('cardPaymentFailedBody')}</p>
      {orderNumber && (
        <p className="order-result-number">
          {t('orderNumber')}: {orderNumber}
        </p>
      )}
      <Link to="/proizvodi" className="cart-continue">
        {t('continueShopping')}
      </Link>
    </div>
  )
}

export default OrderResult
