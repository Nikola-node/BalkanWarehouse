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

  const [ads, setAds] = useState([])
  const [loadingAds, setLoadingAds] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [adError, setAdError] = useState('')
  const [deletingId, setDeletingId] = useState('')
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

  // The list itself is public (it's exactly what the homepage banner
  // already shows everyone), so this loads without needing the admin token
  // - only adding/removing one requires it.
  useEffect(() => {
    if (!token) return
    setLoadingAds(true)
    fetch(`${BACKEND_URL}/api/ads`)
      .then((res) => res.json())
      .then((data) => setAds(data.items))
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUploadAd() {
    if (!selectedFile) return
    setAdError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
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
      clearSelectedFile()
    } catch {
      setAdError('Otpremanje nije uspelo.')
    } finally {
      setUploading(false)
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

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <h2>Podešavanja</h2>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            Odjavi se
          </button>
        </div>

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
          tačna veličina.
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
              </li>
            ))}
            {ads.length === 0 && <p className="admin-hint">Trenutno nema reklama.</p>}
          </ul>
        )}

        <label className="form-field">
          <span className="form-field-label">Nova slika</span>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} />
        </label>

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
    </div>
  )
}

export default Admin
