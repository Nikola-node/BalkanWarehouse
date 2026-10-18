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
