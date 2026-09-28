import { useEffect, useRef, useState } from 'react'
import { BACKEND_URL } from '../config'

// Self-contained "upload/list/edit-link/delete" panel for one set of
// homepage banner images - used twice in Admin.jsx (once for the desktop
// banner, once for the separate mobile-only one), each pointed at its own
// API path so the two image sets never mix.
function AdsManager({ token, forceLogout, apiPath, adminApiPath, title, hint }) {
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

  // The list itself is public (it's exactly what the homepage banner
  // already shows everyone), so this loads without needing the admin token
  // - only adding/removing one requires it.
  useEffect(() => {
    if (!token) return
    setLoadingAds(true)
    fetch(`${BACKEND_URL}${apiPath}`)
      .then((res) => res.json())
      .then((data) => {
        setAds(data.items)
        setLinkDrafts(Object.fromEntries(data.items.map((ad) => [ad.id, ad.link || ''])))
      })
      .finally(() => setLoadingAds(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await fetch(`${BACKEND_URL}${adminApiPath}`, {
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
      const res = await fetch(`${BACKEND_URL}${adminApiPath}/${encodeURIComponent(id)}`, {
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

  async function handleDeleteAd(id) {
    if (!window.confirm('Ukloniti ovu reklamu sa početne strane?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${BACKEND_URL}${adminApiPath}/${encodeURIComponent(id)}`, {
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

  return (
    <div className="admin-card admin-ads-card">
      <h2>{title}</h2>
      <p className="admin-hint">{hint}</p>

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

      <button type="button" className="add-to-cart" onClick={handleUploadAd} disabled={!selectedFile || uploading}>
        {uploading ? 'Otpremanje...' : 'Otpremi sliku'}
      </button>
    </div>
  )
}

export default AdsManager
