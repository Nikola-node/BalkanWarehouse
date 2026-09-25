import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { BACKEND_URL, RECAPTCHA_SITE_KEY } from '../config'
import { t } from '../i18n'

const ADDRESS = 'Kneza Višeslava 63, TC Vidikovac Lokal/1.43, Beograd'
// A plain OpenStreetMap pin at the building's actual coordinates - a
// name/address-search embed (e.g. Google's "?q=...&output=embed") risks
// matching and labeling some unrelated business already indexed at the same
// street number instead of just dropping a marker where we point it.
const LAT = 44.744443
const LON = 20.427233
const MAP_SRC = `https://www.openstreetmap.org/export/embed.html?bbox=${LON - 0.004}%2C${LAT - 0.003}%2C${LON + 0.004}%2C${LAT + 0.003}&layer=mapnik&marker=${LAT}%2C${LON}`
const MAP_LINK = `https://www.openstreetmap.org/?mlat=${LAT}&mlon=${LON}#map=17/${LAT}/${LON}`

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const recaptchaRef = useRef(null)
  const widgetId = useRef(null)
  const leftColRef = useRef(null)
  const messageRef = useRef(null)
  const [mapHeight, setMapHeight] = useState(null)

  // The map should end level with the bottom of the message box, not the
  // whole (taller) form - measured live rather than a fixed guess, since the
  // exact height shifts with label wrapping/font differences between sr/en.
  useLayoutEffect(() => {
    function measure() {
      if (!leftColRef.current || !messageRef.current) return
      const top = leftColRef.current.getBoundingClientRect().top
      const bottom = messageRef.current.getBoundingClientRect().bottom
      setMapHeight(bottom - top)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Same manual grecaptcha render pattern as the checkout form - the script
  // itself is loaded once, globally, in index.html.
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

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
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
      const res = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken }),
      })
      if (!res.ok) throw new Error('contact request failed')
      setForm({ name: '', email: '', message: '' })
      if (RECAPTCHA_SITE_KEY) window.grecaptcha?.reset(widgetId.current)
      Swal.fire({
        icon: 'success',
        title: t('contactSuccessTitle'),
        text: t('contactSuccessBody'),
        confirmButtonText: 'OK',
        confirmButtonColor: '#111111',
      })
    } catch {
      setError(t('contactError'))
      if (RECAPTCHA_SITE_KEY) window.grecaptcha?.reset(widgetId.current)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contact-page">
      <div className="contact-left" ref={leftColRef}>
        <form className="contact-form" onSubmit={handleSubmit}>
          <h1>{t('footerContactUs')}</h1>
          <p className="contact-form-intro">{t('contactFormIntro')}</p>

          <label>
            {t('contactYourName')} <span className="required-star">*</span>
          </label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder={t('contactYourName')} required />

          <label>
            {t('contactYourEmail')} <span className="required-star">*</span>
          </label>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={t('contactYourEmail')} required />

          <label>
            {t('contactYourMessage')} <span className="required-star">*</span>
          </label>
          <textarea
            ref={messageRef}
            name="message"
            rows={6}
            value={form.message}
            onChange={handleChange}
            placeholder={t('contactYourMessage')}
            required
          />

          {RECAPTCHA_SITE_KEY ? (
            <div ref={recaptchaRef} className="contact-recaptcha" />
          ) : (
            <p className="recaptcha-placeholder">
              reCAPTCHA nije podešan — dodajte VITE_RECAPTCHA_SITE_KEY u frontend/.env
            </p>
          )}

          {error && <p className="contact-form-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? t('contactSending') : t('contactSend')}
          </button>
        </form>

        <div className="contact-info">
          <h2>{t('contactInfoTitle')}</h2>
          <p>{ADDRESS}</p>
          <p>
            <a href="tel:+38162625111">+381 62 625 111</a>
          </p>
          <p>
            <a href="mailto:info@balkanwarehouse.com">info@balkanwarehouse.com</a>
          </p>
        </div>
      </div>

      <div className="contact-map">
        <iframe
          title="BalkanWarehouse"
          src={MAP_SRC}
          referrerPolicy="no-referrer-when-downgrade"
          style={mapHeight ? { height: mapHeight } : undefined}
        />
        <a href={MAP_LINK} target="_blank" rel="noreferrer" className="contact-map-link">
          {ADDRESS}
        </a>
      </div>
    </div>
  )
}

export default Contact
