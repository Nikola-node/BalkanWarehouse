import { useEffect, useRef, useState } from 'react'
import { BACKEND_URL, RECAPTCHA_SITE_KEY } from '../config'
import AdsManager from './AdsManager'

const ORDER_STATUS_LABELS = {
  pending: 'Nova',
  paid: 'Rezervisano',
  failed: 'Neuspešno',
  captured: 'Naplaćeno',
  voided: 'Otkazano',
  refunded: 'Povraćeno',
}

// Not linked from anywhere in the site's nav - reached only by knowing the
// /admin URL, which is enough gatekeeping for a single-owner internal tool
// sitting behind its own password.
//
// The session token is kept in plain React state, not localStorage - it's
// meant to require logging in again every time this page is visited, even
// within the same browser session, rather than silently staying signed in.
function Admin() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [view, setView] = useState('settings')
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState('')
  const [actingOrderId, setActingOrderId] = useState('')
  const [actionError, setActionError] = useState('')

  const recaptchaRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || token) return

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
  }, [token])

  function forceLogout() {
    setToken('')
    // The login form (and its recaptcha container div) unmounts while
    // logged in and gets a fresh DOM node on the way back - without
    // clearing this, the render effect would see a stale widget id and
    // skip re-rendering the widget into that new node, leaving it blank.
    widgetId.current = null
  }

  useEffect(() => {
    if (!token) return
    setLoadingSettings(true)
    fetch(`${BACKEND_URL}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          forceLogout()
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data) setRateInput(String(data.eurToRsdRate))
      })
      .finally(() => setLoadingSettings(false))
  }, [token])

  // Loaded once, the first time the Orders tab is actually opened - not on
  // login, since most visits to this page are just to change the rate or
  // banners and don't need the order list fetched at all.
  useEffect(() => {
    if (!token || view !== 'orders' || ordersLoaded) return
    setLoadingOrders(true)
    fetch(`${BACKEND_URL}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          forceLogout()
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data) {
          setOrders(data.items)
          setOrdersLoaded(true)
        }
      })
      .finally(() => setLoadingOrders(false))
  }, [token, view, ordersLoaded])

  async function handleDeleteOrder(orderNumber) {
    if (!window.confirm(`Obrisati porudžbinu ${orderNumber}? Ovo se ne može poništiti.`)) return
    setDeletingOrderId(orderNumber)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        forceLogout()
        return
      }
      const data = await res.json()
      if (res.ok) setOrders(data.items)
    } finally {
      setDeletingOrderId('')
    }
  }

  const ACTION_CONFIRM = {
    capture: (n) => `Naplatiti porudžbinu ${n}? Ovo stvarno zadužuje karticu kupca - uradite ovo tek kada je porudžbina poslata.`,
    void: (n) => `Otkazati rezervaciju za porudžbinu ${n}? Kupac neće biti zadužen.`,
    refund: (n) => `Vratiti novac za porudžbinu ${n}?`,
  }

  async function handleOrderAction(orderNumber, action) {
    if (!window.confirm(ACTION_CONFIRM[action](orderNumber))) return
    setActingOrderId(orderNumber)
    setActionError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${encodeURIComponent(orderNumber)}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        forceLogout()
        return
      }
      const data = await res.json()
      if (res.ok) {
        setOrders(data.items)
      } else {
        setActionError(`${orderNumber}: ${data.error || 'Akcija nije uspela.'}`)
      }
    } catch {
      setActionError(`${orderNumber}: Akcija nije uspela.`)
    } finally {
      setActingOrderId('')
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')

    let recaptchaToken = ''
    if (RECAPTCHA_SITE_KEY) {
      recaptchaToken = window.grecaptcha?.getResponse(widgetId.current) || ''
      if (!recaptchaToken) {
        setLoginError('Molimo potvrdite da niste robot.')
        return
      }
    }

    setLoggingIn(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, recaptchaToken }),
      })
      if (!res.ok) {
        setLoginError(res.status === 400 ? 'Neuspešna provera da niste robot.' : 'Pogrešna lozinka.')
        if (RECAPTCHA_SITE_KEY) window.grecaptcha?.reset(widgetId.current)
        return
      }
      const data = await res.json()
      setToken(data.token)
      setPassword('')
    } finally {
      setLoggingIn(false)
    }
  }

  function handleLogout() {
    fetch(`${BACKEND_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    forceLogout()
  }

  async function handleSaveRate(e) {
    e.preventDefault()
    const value = Number(rateInput)
    if (!Number.isFinite(value) || value <= 0) return

    setSaving(true)
    setSaveMessage('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eurToRsdRate: value }),
      })
      if (res.status === 401) {
        forceLogout()
        return
      }
      if (res.ok) {
        const data = await res.json()
        setRateInput(String(data.eurToRsdRate))
        setSaveMessage('Sačuvano.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <div className="admin-page">
        <form className="admin-card" onSubmit={handleLogin}>
          <h2>Admin prijava</h2>
          <label className="form-field">
            <span className="form-field-label">Lozinka</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          <div className="recaptcha-box">
            {RECAPTCHA_SITE_KEY ? (
              <div ref={recaptchaRef} />
            ) : (
              <p className="recaptcha-placeholder">
                reCAPTCHA nije podešan — dodajte VITE_RECAPTCHA_SITE_KEY u frontend/.env
              </p>
            )}
          </div>
          {loginError && <p className="admin-error">{loginError}</p>}
          <button type="submit" className="add-to-cart admin-login-submit" disabled={loggingIn}>
            {loggingIn ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    )
  }

  const rate = Number(rateInput) || 117.5

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <nav className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            Podešavanja
          </button>
          <button
            type="button"
            className={`admin-tab ${view === 'orders' ? 'active' : ''}`}
            onClick={() => setView('orders')}
          >
            Narudžbine
          </button>
        </nav>
        <button type="button" className="admin-logout" onClick={handleLogout}>
          Odjavi se
        </button>
      </div>

      {view === 'orders' ? (
        <div className="admin-card admin-orders-card">
          <h2>Narudžbine</h2>
          {actionError && <p className="admin-error">{actionError}</p>}
          {loadingOrders ? (
            <p>Učitavanje...</p>
          ) : orders.length === 0 ? (
            <p className="admin-hint">Trenutno nema porudžbina.</p>
          ) : (
            <div className="admin-orders-table-wrap">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    <th>Ime i prezime</th>
                    <th>Broj narudžbine</th>
                    <th>Datum</th>
                    <th>Artikli</th>
                    <th>Iznos</th>
                    <th>Telefon</th>
                    <th>Mesto</th>
                    <th>Adresa</th>
                    <th>Plaćanje</th>
                    <th>Status</th>
                    <th>DMS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const itemsCostRsd = Math.round(order.total * rate)
                    const grandTotalRsd = itemsCostRsd + (order.deliveryCostRsd || 0)
                    const acting = actingOrderId === order.orderNumber
                    return (
                      <tr key={order.orderNumber}>
                        <td>
                          {order.customer?.firstName} {order.customer?.lastName}
                        </td>
                        <td>{order.orderNumber}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString('sr-RS')}</td>
                        <td>
                          <ol className="admin-orders-items">
                            {order.items?.map((item, i) => (
                              <li key={i}>
                                {item.name} × {item.quantity}
                              </li>
                            ))}
                          </ol>
                        </td>
                        <td>{grandTotalRsd.toLocaleString('sr-RS')} RSD</td>
                        <td>{order.customer?.phone}</td>
                        <td>{order.customer?.city}</td>
                        <td>{order.customer?.address}</td>
                        <td>{order.paymentMethod === 'card' ? 'Kartica' : 'Pouzeće'}</td>
                        <td>{ORDER_STATUS_LABELS[order.status] || order.status || '-'}</td>
                        <td>
                          {order.paymentMethod === 'card' && order.status === 'paid' && (
                            <div className="admin-orders-dms-actions">
                              <button
                                type="button"
                                className="admin-orders-action"
                                onClick={() => handleOrderAction(order.orderNumber, 'capture')}
                                disabled={acting}
                              >
                                Naplati
                              </button>
                              <button
                                type="button"
                                className="admin-orders-action admin-orders-action-void"
                                onClick={() => handleOrderAction(order.orderNumber, 'void')}
                                disabled={acting}
                              >
                                Otkaži
                              </button>
                            </div>
                          )}
                          {order.paymentMethod === 'card' && order.status === 'captured' && (
                            <button
                              type="button"
                              className="admin-orders-action admin-orders-action-void"
                              onClick={() => handleOrderAction(order.orderNumber, 'refund')}
                              disabled={acting}
                            >
                              Povraćaj
                            </button>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-orders-delete"
                            onClick={() => handleDeleteOrder(order.orderNumber)}
                            disabled={deletingOrderId === order.orderNumber}
                            aria-label="Obriši"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
      <div className="admin-card">
        <h2>Kurs razmene</h2>
        {loadingSettings ? (
          <p>Učitavanje...</p>
        ) : (
          <form onSubmit={handleSaveRate}>
            <label className="form-field">
              <span className="form-field-label">Kurs (1 EUR = ? RSD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
              />
            </label>
            <p className="admin-hint">
              Ovaj kurs se koristi za prikaz svih cena na sajtu (proizvodi, korpa, porudžbine) u dinarima.
            </p>
            <button type="submit" className="add-to-cart" disabled={saving}>
              {saving ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
            {saveMessage && <p className="admin-save-message">{saveMessage}</p>}
          </form>
        )}
      </div>

      <AdsManager
        token={token}
        forceLogout={forceLogout}
        apiPath="/api/ads"
        adminApiPath="/api/admin/ads"
        title="Reklame (računar)"
        hint="Slike koje se prikazuju u baneru na početnoj strani kad je sajt otvoren na računaru (ekrani širi od 900px). Preporučen format je 3:1: 1920×640px (za oštrije slike na ekranima visoke rezolucije 2544×848px). Slika se sa strana iseče da popuni taj format, pa važno je da ključni deo bude u sredini. Svaka slika može da vodi na neku stranicu sajta ili spoljni link kada se klikne - npr. /proizvodi?nodeId=neka-kategorija, /product/123, ili puna adresa poput https://..."
      />

      <AdsManager
        token={token}
        forceLogout={forceLogout}
        apiPath="/api/ads/mobile"
        adminApiPath="/api/admin/ads/mobile"
        title="Reklame (mobilni)"
        hint="Posebne slike koje se prikazuju umesto gornjih kad je sajt otvoren na telefonu ili tabletu (ekrani do 900px). Preporučen format je 4:5: 800×1000px. Slika se prikazuje cela, bez sečenja, sa malom belom ivicom oko nje. Isti sistem linkova kao gore."
      />
        </>
      )}
    </div>
  )
}

export default Admin
