import { useEffect, useRef, useState } from 'react'
import { BACKEND_URL, RECAPTCHA_SITE_KEY } from '../config'

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

  const [ads, setAds] = useState([])
  const [loadingAds, setLoadingAds] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [newAdLink, setNewAdLink] = useState('')
  const [uploading, setUploading] = useState(false)
  const [adError, setAdError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  // Draft link text per ad id, kept separate from the saved `ads` list so
  // typing doesn't need a round-trip to the server on every keystroke.
  const [linkDrafts, setLinkDrafts] = useState({})
  const [savingLinkId, setSavingLinkId] = useState('')
  const fileInputRef = useRef(null)

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

  // The list itself is public (it's exactly what the homepage banner
  // already shows everyone), so this loads without needing the admin token
  // - only adding/removing one requires it.
  useEffect(() => {
    if (!token) return
    setLoadingAds(true)
    fetch(`${BACKEND_URL}/api/ads`)
      .then((res) => res.json())
      .then((data) => {
        setAds(data.items)
        setLinkDrafts(Object.fromEntries(data.items.map((ad) => [ad.id, ad.link || ''])))
      })
      .finally(() => setLoadingAds(false))
  }, [token])

  // Revokes the previous preview's object URL whenever a new file is picked
  // (or this component unmounts) - otherwise each selection leaks the
  // in-memory blob the browser created for the last one.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileSelect(e) {
    const file = e.target.files?.[0] || null
    setAdError('')
    setSelectedFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : '')
  }

  function clearSelectedFile() {
    setSelectedFile(null)
    setPreviewUrl('')
    setNewAdLink('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUploadAd() {
    if (!selectedFile) return
    setAdError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('link', newAdLink.trim())
      const res = await fetch(`${BACKEND_URL}/api/admin/ads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.status === 401) {
        forceLogout()
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setAdError(data.error || 'Otpremanje nije uspelo.')
        return
      }
      setAds(data.items)
      setLinkDrafts(Object.fromEntries(data.items.map((ad) => [ad.id, ad.link || ''])))
      clearSelectedFile()
    } catch {
      setAdError('Otpremanje nije uspelo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveLink(id) {
    setSavingLinkId(id)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/ads/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ link: (linkDrafts[id] || '').trim() }),
      })
      if (res.status === 401) {
        forceLogout()
        return
      }
      const data = await res.json()
      if (res.ok) {
        setAds(data.items)
        setLinkDrafts(Object.fromEntries(data.items.map((ad) => [ad.id, ad.link || ''])))
      }
    } finally {
      setSavingLinkId('')
    }
  }

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

  async function handleDeleteAd(id) {
    if (!window.confirm('Ukloniti ovu reklamu sa početne strane?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/ads/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        forceLogout()
        return
      }
      const data = await res.json()
      if (res.ok) setAds(data.items)
    } finally {
      setDeletingId('')
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const itemsCostRsd = Math.round(order.total * rate)
                    const grandTotalRsd = itemsCostRsd + (order.deliveryCostRsd || 0)
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

      <div className="admin-card admin-ads-card">
        <h2>Reklame</h2>
        <p className="admin-hint">
          Slike koje se prikazuju u baneru na početnoj strani. Preporučen format je oko 3:1 (npr.
          1500×500px) - svaka slika se automatski iseče da popuni taj format, tako da nije potrebna
          tačna veličina. Svaka slika može da vodi na neku stranicu sajta ili spoljni link kada se
          klikne - npr. /proizvodi?nodeId=neka-kategorija, /product/123, ili puna adresa poput
          https://...
        </p>

        {loadingAds ? (
          <p>Učitavanje...</p>
        ) : (
          <ul className="admin-ads-list">
            {ads.map((ad) => (
              <li key={ad.id} className="admin-ads-item">
                <img src={`${BACKEND_URL}${ad.url}`} alt="" />
                <button
                  type="button"
                  className="admin-ads-remove"
                  onClick={() => handleDeleteAd(ad.id)}
                  disabled={deletingId === ad.id}
                  aria-label="Ukloni"
                >
                  ×
                </button>
                <div className="admin-ads-link-row">
                  <input
                    type="text"
                    className="admin-ads-link-input"
                    placeholder="Link (opciono)"
                    value={linkDrafts[ad.id] ?? ''}
                    onChange={(e) => setLinkDrafts({ ...linkDrafts, [ad.id]: e.target.value })}
                  />
                  <button
                    type="button"
                    className="admin-ads-link-save"
                    onClick={() => handleSaveLink(ad.id)}
                    disabled={savingLinkId === ad.id || (linkDrafts[ad.id] ?? '') === (ad.link || '')}
                  >
                    {savingLinkId === ad.id ? '...' : 'Sačuvaj'}
                  </button>
                </div>
              </li>
            ))}
            {ads.length === 0 && <p className="admin-hint">Trenutno nema reklama.</p>}
          </ul>
        )}

        <label className="form-field">
          <span className="form-field-label">Nova slika</span>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} />
        </label>

        {selectedFile && (
          <label className="form-field">
            <span className="form-field-label">Link (opciono)</span>
            <input
              type="text"
              placeholder="/proizvodi?nodeId=... ili https://..."
              value={newAdLink}
              onChange={(e) => setNewAdLink(e.target.value)}
            />
          </label>
        )}

        {previewUrl && (
          <div className="admin-ads-preview">
            <img src={previewUrl} alt="" className="admin-ads-preview-image" />
          </div>
        )}

        {adError && <p className="admin-error">{adError}</p>}

        <button
          type="button"
          className="add-to-cart"
          onClick={handleUploadAd}
          disabled={!selectedFile || uploading}
        >
          {uploading ? 'Otpremanje...' : 'Otpremi sliku'}
        </button>
      </div>
        </>
      )}
    </div>
  )
}

export default Admin
