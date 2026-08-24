import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../CartContext'
import { BACKEND_URL, RECAPTCHA_SITE_KEY } from '../config'
import { t } from '../i18n'

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

function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart()
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

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

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

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
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer: form, paymentMethod, total, recaptchaToken }),
      })
      if (!res.ok) throw new Error('order request failed')
      clearCart()
      setSubmitted(true)
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
        <Link to="/" className="cart-continue">
          {t('continueShopping')}
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <p>{t('emptyCart')}</p>
        <Link to="/" className="cart-continue">
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
            <img src={item.image} alt={item.name} className="cart-item-image" />
            <div className="cart-item-info">
              <p className="cart-item-name">{item.name}</p>
              {(item.colorName || item.size) && (
                <p className="cart-item-meta">
                  {[item.colorName, item.size].filter(Boolean).join(' / ')}
                </p>
              )}
              <p className="cart-item-price">€{item.price.toFixed(2)}</p>
            </div>
            <div className="cart-item-stepper">
              <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                −
              </button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                +
              </button>
            </div>
            <p className="cart-item-line-total">€{(item.price * item.quantity).toFixed(2)}</p>
            <button
              type="button"
              className="cart-item-remove"
              onClick={() => removeItem(item.id)}
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
          <span>€{total.toFixed(2)}</span>
        </div>
        <div className="cart-price-row">
          <span>{t('deliveryCost')}</span>
          <span>{t('free')}</span>
        </div>
        <div className="cart-price-row cart-price-total">
          <span>{t('total')}</span>
          <span>€{total.toFixed(2)}</span>
        </div>
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
          checked={paymentMethod === 'card'}
          onChange={() => setPaymentMethod('card')}
        />
        {t('payByCard')}
      </label>
      <label className="checkout-radio">
        <input
          type="radio"
          name="payment"
          checked={paymentMethod === 'cash'}
          onChange={() => setPaymentMethod('cash')}
        />
        {t('payByCash')}
      </label>

      <div className="recipient-card">
        <h2 className="checkout-step-title recipient-title">{t('recipientInfo')}</h2>

        <FormField
          label={t('firstName')}
          required
          value={form.firstName}
          onChange={(e) => updateField('firstName', e.target.value)}
        />
        <FormField
          label={t('lastName')}
          required
          value={form.lastName}
          onChange={(e) => updateField('lastName', e.target.value)}
        />
        <FormField
          label={t('phone')}
          required
          type="tel"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
        />
        <FormField
          label={t('email')}
          required
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
        <FormField
          label={t('address')}
          required
          value={form.address}
          onChange={(e) => updateField('address', e.target.value)}
        />
        <FormField
          label={t('address2')}
          value={form.address2}
          onChange={(e) => updateField('address2', e.target.value)}
        />
        <FormField
          label={t('city')}
          required
          value={form.city}
          onChange={(e) => updateField('city', e.target.value)}
        />
        <FormField
          label={t('zip')}
          required
          value={form.zip}
          onChange={(e) => updateField('zip', e.target.value)}
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

      {error && <p className="checkout-error">{error}</p>}

      <button type="submit" className="checkout-submit" disabled={submitting}>
        {submitting ? t('placingOrder') : t('placeOrder')}
      </button>
    </form>
  )
}

export default Cart
