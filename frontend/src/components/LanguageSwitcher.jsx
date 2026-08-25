import { useEffect, useRef, useState } from 'react'
import { getLang, setLang } from '../i18n'

const LANGS = [
  { code: 'sr', label: 'SR' },
  { code: 'en', label: 'EN' },
]

function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const current = getLang()

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="lang-switcher" ref={wrapperRef}>
      <button type="button" className="lang-switcher-trigger" onClick={() => setOpen(!open)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <path d="M12 3c2.5 2.5 3.8 5.8 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.8-3.8-9s1.3-6.5 3.8-9z" />
        </svg>
        {current.toUpperCase()}
        <span className={`lang-switcher-chevron ${open ? 'open' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="lang-switcher-menu">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              className={l.code === current ? 'active' : ''}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
