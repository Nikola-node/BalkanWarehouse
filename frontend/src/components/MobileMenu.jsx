import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { t } from '../i18n'
import CategoryFilterTree from './CategoryFilterTree'

// The phone-only hamburger button and the slide-out drawer it opens, which
// replaces the KATEGORIJE/O NAMA/KONTAKT bar on narrow screens (that bar
// relies on hover for its category submenu, which doesn't exist on touch).
// The category list itself reuses CategoryFilterTree as-is - the same
// expand/collapse tree already used in the product-list sidebar - rather
// than building a second one.
function MobileMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Background stays put while the drawer is open, same as any other
  // full-screen overlay - otherwise the page behind it scrolls along with
  // a touch-drag meant for the drawer.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  function close() {
    setOpen(false)
  }

  function goToNode(nodeId) {
    navigate(`/proizvodi?nodeId=${encodeURIComponent(nodeId)}`)
    close()
  }

  return (
    <>
      <button type="button" className="mobile-menu-trigger" onClick={() => setOpen(true)} aria-label={t('menu')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="mobile-menu-overlay" onClick={close}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span>{t('menu')}</span>
              <button type="button" className="mobile-menu-close" onClick={close} aria-label={t('closeMenu')}>
                ×
              </button>
            </div>

            <div className="mobile-menu-body">
              <CategoryFilterTree onSelect={goToNode} />
              <Link to="/o-nama" className="mobile-menu-link" onClick={close}>
                {t('footerAbout')}
              </Link>
              <Link to="/kontakt" className="mobile-menu-link" onClick={close}>
                {t('navContact')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileMenu
