import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import { useCart } from '../CartContext'
import { useCurrency } from '../CurrencyContext'
import { BACKEND_URL, RECAPTCHA_SITE_KEY } from '../config'
import { t, getLang } from '../i18n'

const initialForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  address2: '',
  city: '',
  zip: '',
  note: '',
}

function FormField({ label, textarea, ...props }) {
  return (
    <label className="form-field">
      <span className="form-field-label">{label}</span>
      {textarea ? <textarea {...props} /> : <input {...props} />}
    </label>
  )
}

// A "?" button next to the delivery cost row that reveals the weight-tier
// table it's computed from - fetched from the backend (rather than
// hardcoded here) so it can never drift from the actual pricing logic.
function DeliveryInfoButton() {
  const { formatRsd } = useCurrency()
  const [open, setOpen] = useState(false)
  const [tiers, setTiers] = useState(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open || tiers) return
    fetch(`${BACKEND_URL}/api/delivery-tiers`)
      .then((res) => res.json())
      .then(setTiers)
      .catch(() => {})
  }, [open, tiers])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const lastTier = tiers?.tiers[tiers.tiers.length - 1]
  // Split off just the first word (e.g. "per") so it can sit on the price
  // line instead of wrapping down with the rest of the sentence.
  const suffix = t('deliveryPerKgSuffix')
  const suffixSpaceIndex = suffix.indexOf(' ')
  const suffixFirstWord = suffixSpaceIndex === -1 ? suffix : suffix.slice(0, suffixSpaceIndex)
  const suffixRest = suffixSpaceIndex === -1 ? '' : suffix.slice(suffixSpaceIndex + 1)

  return (
    <span className="delivery-info" ref={wrapperRef} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="delivery-info-trigger"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-label={t('deliveryInfoLabel')}
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div className="delivery-info-popover" role="tooltip">
          <p className="delivery-info-intro">{t('deliveryInfoIntro')}</p>
          {tiers && (
            <table className="delivery-info-table">
              <tbody>
                {tiers.tiers.map((tier, i) => (
                  <tr key={tier.upToKg}>
                    <td>
                      {i === 0
                        ? `${t('deliveryUpToPrefix')} ${tier.upToKg} kg`
                        : `${tiers.tiers[i - 1].upToKg}–${tier.upToKg} kg`}
                    </td>
                    <td>{formatRsd(tier.price)}</td>
                  </tr>
                ))}
                <tr className="delivery-info-over-row">
                  <td>
                    {t('deliveryOverPrefix')} {lastTier.upToKg} kg
                  </td>
                  <td>
                    {formatRsd(lastTier.price)} + {formatRsd(tiers.perKgOver20)} {suffixFirstWord}
                    <br />
                    {suffixRest}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </span>
  )
}

function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart()
  const { formatPrice, formatLineTotal, toRsd, formatRsd } = useCurrency()
  // Summed from each item's own rounded-to-RSD line total, not from the raw
  // EUR total - otherwise the displayed grand total can land a few dinars
  // off from what adding up the displayed line totals gives you.
  const totalRsd = items.reduce((sum, item) => sum + toRsd(item.price) * item.quantity, 0)
  // Computed by the backend from each item's real weight, same as the
  // price - never guessed client-side, so it can't drift from what the
  // order will actually be charged.
  const [deliveryCostRsd, setDeliveryCostRsd] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [installments, setInstallments] = useState('')
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  // Holds the raw typed text while a quantity field is being edited, keyed
  // by item id - kept separate from the cart's own quantity (a number) for
  // the same reason as the product page's quantity field: converting on
  // every keystroke makes a cleared field flash "0" before the next digit.
  const [quantityDrafts, setQuantityDrafts] = useState({})

  const recaptchaRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return

    function render() {
      if (window.grecaptcha?.render && recaptchaRef.current && widgetId.current === null) {
        widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
        })
      }
    }

    if (window.grecaptcha?.render) {
      render()
      return
    }
    const interval = setInterval(() => {
      if (window.grecaptcha?.render) {
        render()
        clearInterval(interval)
      }
    }, 300)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (items.length === 0) {
      setDeliveryCostRsd(0)
      return
    }
    fetch(`${BACKEND_URL}/api/delivery-cost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
      .then((res) => res.json())
      .then((data) => setDeliveryCostRsd(data.cost || 0))
      .catch(() => {})
  }, [items])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Without this, Enter in a plain text input inside a <form> submits the
  // form natively - on this page that would place the order. Moving focus
  // to the next field instead both fixes that and gives the requested
  // "Enter jumps to the next field" behavior. Scoped to .recipient-card so
  // it only affects the customer-info fields, not the payment/delivery
  // radios above them.
  function handleFieldKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const fields = Array.from(e.currentTarget.closest('.recipient-card').querySelectorAll('input, textarea'))
    const next = fields[fields.indexOf(e.currentTarget) + 1]
    if (next) next.focus()
  }

  function confirmRemove(id) {
    Swal.fire({
      icon: 'warning',
      text: t('removeConfirmText'),
      showCancelButton: true,
      confirmButtonText: t('yes'),
      cancelButtonText: t('no'),
      confirmButtonColor: '#111111',
      cancelButtonColor: '#999999',
    }).then((result) => {
      if (result.isConfirmed) {
        removeItem(id)
        Swal.fire({
          icon: 'success',
          text: t('removedFromCart'),
          showConfirmButton: false,
          timer: 1200,
        })
      }
    })
  }

  // Shared by the stepper's "-" button and the manually-typed quantity
  // field, so dragging/typing a quantity down to zero asks for confirmation
  // the same way the × remove button does, instead of silently vanishing.
  function changeQuantity(id, quantity) {
    if (quantity <= 0) {
      confirmRemove(id)
    } else {
      updateQuantity(id, quantity)
    }
  }

  function handleQuantityInput(id, value) {
    setQuantityDrafts((prev) => ({ ...prev, [id]: value }))
  }

  function commitQuantityDraft(item) {
    const raw = quantityDrafts[item.id]
    setQuantityDrafts((prev) => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })
    if (raw === undefined) return
    const qty = parseInt(raw, 10)
    if (!Number.isInteger(qty) || qty === item.quantity) return
    changeQuantity(item.id, qty)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!agreedToTerms) {
      setError(t('agreeToTermsError'))
      return
    }

    let recaptchaToken = ''
    if (RECAPTCHA_SITE_KEY) {
      recaptchaToken = window.grecaptcha?.getResponse(widgetId.current) || ''
      if (!recaptchaToken) {
        setError(t('captchaError'))
        return
      }
    }

    setSubmitting(true)
    try {
      if (paymentMethod === 'card') {
        const res = await fetch(`${BACKEND_URL}/api/orders/card-init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, customer: form, recaptchaToken, lang: getLang(), installments }),
        })
        if (!res.ok) throw new Error('card init failed')
        const { gatewayUrl, fields } = await res.json()
        // Not a fetch - this navigates the whole browser away to NestPay's
        // hosted payment page, exactly like the bank's own POST.txt example.
        // The cart is intentionally left alone here (not cleared) in case
        // the customer cancels or the payment fails and they come back.
        const gatewayForm = document.createElement('form')
        gatewayForm.method = 'POST'
        gatewayForm.action = gatewayUrl
        for (const [name, value] of Object.entries(fields)) {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = name
          input.value = value
          gatewayForm.appendChild(input)
        }
        document.body.appendChild(gatewayForm)
        gatewayForm.submit()
        return
      }

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer: form, paymentMethod, total, recaptchaToken, lang: getLang() }),
      })
      if (!res.ok) throw new Error('order request failed')
      clearCart()
      setSubmitted(true)
      // Swapping to the confirmation view happens in place on the same
      // /cart route (no navigation), so nothing else resets scroll - left
      // alone, it renders wherever the long checkout form was scrolled to.
      window.scrollTo(0, 0)
      Swal.fire({
        icon: 'info',
        title: t('printNoticeTitle'),
        text: t('printNoticeBody'),
        showCloseButton: true,
        confirmButtonText: 'OK',
        confirmButtonColor: '#111111',
      })
    } catch {
      setError(t('orderError'))
      if (RECAPTCHA_SITE_KEY) window.grecaptcha?.reset(widgetId.current)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="cart-empty">
        <h1>{t('orderSuccessTitle')}</h1>
        <p>{t('orderSuccessBody')}</p>
        <Link to="/proizvodi" className="cart-continue">
          {t('continueShopping')}
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <p>{t('emptyCart')}</p>
        <Link to="/proizvodi" className="cart-continue">
          {t('continueShopping')}
        </Link>
      </div>
    )
  }

  return (
    <form className="checkout" onSubmit={handleSubmit}>
      <h2 className="checkout-step-title">1. {t('selectedItems')}</h2>

      <ul className="cart-items">
        {items.map((item) => (
          <li key={item.id} className="cart-item">
            <Link to={`/product/${item.id}`} className="cart-item-link">
              <img src={item.image} alt={item.name} className="cart-item-image" />
              <div className="cart-item-info">
                <p className="cart-item-name">{item.name}</p>
                {(item.colorName || item.size) && (
                  <p className="cart-item-meta">
                    {[item.colorName, item.size].filter(Boolean).join(' / ')}
                  </p>
                )}
                <p className="cart-item-price">{formatPrice(item.price)}</p>
              </div>
            </Link>
            <div className="cart-item-stepper">
              <button type="button" onClick={() => changeQuantity(item.id, item.quantity - 1)}>
                −
              </button>
              <input
                type="number"
                min="0"
                className="cart-item-qty-input"
                value={quantityDrafts[item.id] ?? String(item.quantity)}
                onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                onBlur={() => commitQuantityDraft(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.target.blur()
                  }
                }}
              />
              <button type="button" onClick={() => changeQuantity(item.id, item.quantity + 1)}>
                +
              </button>
            </div>
            <p className="cart-item-line-total">{formatLineTotal(item.price, item.quantity)}</p>
            <button
              type="button"
              className="cart-item-remove"
              onClick={() => confirmRemove(item.id)}
              aria-label={t('remove')}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="cart-clear" onClick={clearCart}>
        {t('clearCart')}
      </button>

      <div className="cart-price-breakdown">
        <div className="cart-price-row">
          <span>{t('itemsCost')}</span>
          <span>{formatRsd(totalRsd)}</span>
        </div>
        <div className="cart-price-row">
          <span className="cart-price-label-with-info">
            <DeliveryInfoButton />
            {t('deliveryCost')}
          </span>
          <span>{formatRsd(deliveryCostRsd)}</span>
        </div>
        <div className="cart-price-row cart-price-total">
          <span>{t('total')}</span>
          <span>{formatRsd(totalRsd + deliveryCostRsd)}</span>
        </div>
        <p className="cart-vat-notice">{t('pricesInclVatNotice')}</p>
      </div>

      <h2 className="checkout-step-title">2. {t('deliveryMethod')}</h2>
      <label className="checkout-radio">
        <input type="radio" name="delivery" checked readOnly />
        {t('deliveryToAddress')}
      </label>

      <h2 className="checkout-step-title">3. {t('paymentMethod')}</h2>
      <label className="checkout-radio">
        <input
          type="radio"
          name="payment"
          checked={paymentMethod === 'cash'}
          onChange={() => setPaymentMethod('cash')}
        />
        {t('payByCash')}
      </label>
      <label className="checkout-radio">
        <input
          type="radio"
          name="payment"
          checked={paymentMethod === 'card'}
          onChange={() => setPaymentMethod('card')}
        />
        {t('payByCard')}
        <span className="checkout-payment-brands">
          <img src="/payment-logos/maestro.png" alt="Maestro" />
          <img src="/payment-logos/mastercard.png" alt="Mastercard" />
          <img src="/payment-logos/dinacard.png" alt="DinaCard" />
          <img src="/payment-logos/visa.png" alt="Visa" />
          <img src="/payment-logos/amex.png" alt="American Express" />
        </span>
      </label>
      {paymentMethod === 'card' && (
        <div className="checkout-installments">
          <label htmlFor="installments">{t('installments')}</label>
          <select
            id="installments"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          >
            <option value="">{t('installmentsNone')}</option>
            {[2, 3, 4, 6, 9, 12].map((n) => (
              <option key={n} value={n}>
                {n} {t('installmentsRate')}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="recipient-card">
        <h2 className="checkout-step-title recipient-title">{t('recipientInfo')}</h2>

        <FormField
          label={t('firstName')}
          required
          value={form.firstName}
          onChange={(e) => updateField('firstName', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('lastName')}
          required
          value={form.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('phone')}
          required
          type="tel"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('email')}
          required
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('address')}
          required
          value={form.address}
          onChange={(e) => updateField('address', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('address2')}
          value={form.address2}
          onChange={(e) => updateField('address2', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('city')}
          required
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('zip')}
          required
          value={form.zip}
          onChange={(e) => updateField('zip', e.target.value)}
          onKeyDown={handleFieldKeyDown}
        />
        <FormField
          label={t('note')}
          textarea
          value={form.note}
          onChange={(e) => updateField('note', e.target.value)}
        />

        <div className="recaptcha-box">
          {RECAPTCHA_SITE_KEY ? (
            <div ref={recaptchaRef} />
          ) : (
            <p className="recaptcha-placeholder">
              reCAPTCHA nije podešan — dodajte VITE_RECAPTCHA_SITE_KEY u frontend/.env
            </p>
          )}
        </div>
      </div>

      <label className="checkout-terms-agree">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
        />
        {t('agreeToTermsPrefix')}{' '}
        <Link to="/uslovi-kupovine" target="_blank" rel="noreferrer">
          {t('termsLinkText')}
        </Link>
      </label>

      {error && <p className="checkout-error">{error}</p>}

      <button type="submit" className="checkout-submit" disabled={submitting}>
        {submitting ? t('placingOrder') : t('placeOrder')}
      </button>
    </form>
  )
}

export default Cart
