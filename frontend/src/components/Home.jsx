import { useEffect, useState } from 'react'
import { Link, useNavigationType } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t, getLang } from '../i18n'
import ProductCarousel from './ProductCarousel'

const SLIDE_INTERVAL_MS = 5000
const NEWEST_INTERVAL_MS = 3000
const PICKED_INTERVAL_MS = 2500
const HOME_SCROLL_KEY = 'scroll:/'
// PickedRows normally reshuffles on every visit - but doing that on the way
// back from clicking one of its own products would also grow/shrink the
// page, throwing off the scroll-restore above. PICKED_ROWS_RETURN_FLAG_KEY
// is set the instant a click lands inside PickedRows (before the Link even
// navigates) and consumed on the very next Home mount, so only that one
// round trip keeps the same random set - a hard reload, the logo, or
// arriving from anywhere else still gets a freshly shuffled one.
const PICKED_ROWS_RETURN_FLAG_KEY = 'pickedRowsReturning'
const PICKED_ROWS_CACHE_KEY = 'pickedRowsCache'

// Rebuilt as a plain crossfade: every slide is absolutely-positioned filling
// the whole box, stacked directly on top of each other, and only its own
// opacity toggles. No width/transform/percentage math of any kind is
// involved, so there's nothing left for a sizing bug to hide in.
function HeroCarousel({ variant = 'desktop' }) {
  const [ads, setAds] = useState([])
  const [index, setIndex] = useState(0)
  const apiPath = variant === 'mobile' ? '/api/ads/mobile' : '/api/ads'

  useEffect(() => {
    fetch(`${BACKEND_URL}${apiPath}`)
      .then((res) => res.json())
      .then((data) => setAds(data.items))
      .catch(() => {})
  }, [apiPath])

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % ads.length), SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [ads.length])

  if (ads.length === 0) return null

  function prev() {
    setIndex((i) => (i - 1 + ads.length) % ads.length)
  }

  function next() {
    setIndex((i) => (i + 1) % ads.length)
  }

  return (
    <div className={`hero-carousel ${variant === 'mobile' ? 'hero-carousel-mobile' : ''}`}>
      {ads.length > 1 && (
        <button type="button" className="hero-arrow hero-arrow-left" onClick={prev} aria-label={t('heroPrevSlide')}>
          ‹
        </button>
      )}

      {ads.map((ad, i) => {
        const image = <img className="hero-slide-image" src={`${BACKEND_URL}${ad.url}`} alt="" />
        return (
          <div className={`hero-slide ${i === index ? 'active' : ''}`} key={ad.id}>
            {ad.link ? (
              ad.link.startsWith('/') ? (
                <Link to={ad.link} className="hero-slide-link">
                  {image}
                </Link>
              ) : (
                <a href={ad.link} target="_blank" rel="noreferrer" className="hero-slide-link">
                  {image}
                </a>
              )
            ) : (
              image
            )}
          </div>
        )
      })}

      {ads.length > 1 && (
        <button type="button" className="hero-arrow hero-arrow-right" onClick={next} aria-label={t('heroNextSlide')}>
          ›
        </button>
      )}

      {ads.length > 1 && (
        <div className="hero-dots">
          {ads.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              className={`hero-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NewestProducts() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const params = new URLSearchParams({ limit: 16, lang: getLang() })
    fetch(`${BACKEND_URL}/api/products/featured?${params}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items))
  }, [])

  return (
    <section className="newest-products">
      <h2>{t('newestProducts')}</h2>
      <ProductCarousel
        items={items}
        classPrefix="newest-products"
        maxVisible={5}
        isNewBadge
        autoAdvanceMs={NEWEST_INTERVAL_MS}
        showDots
      />
    </section>
  )
}

// Five rows of about 15 completely random in-stock products each, drawn from
// the whole catalogue and reshuffled on every visit - except the one visit
// right back from clicking a product in this very list, where it keeps the
// same set it showed before (see PICKED_ROWS_RETURN_FLAG_KEY above). Each
// row reuses the newest row's styling (the "newest-products" classes).
function PickedRows() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (sessionStorage.getItem(PICKED_ROWS_RETURN_FLAG_KEY) === '1') {
      // Cleared on a delay rather than immediately: React's Strict Mode
      // (dev only) deliberately mounts every component twice back to back
      // to surface effect bugs, which would otherwise make the *second*
      // mount find this flag already gone and reshuffle anyway. Deferring
      // past that lets both passes see it; a later, separate visit (a real
      // gap, not a same-tick double-mount) still clears it in time.
      setTimeout(() => sessionStorage.removeItem(PICKED_ROWS_RETURN_FLAG_KEY), 0)
      try {
        const cached = JSON.parse(sessionStorage.getItem(PICKED_ROWS_CACHE_KEY) || 'null')
        if (cached && cached.lang === getLang()) {
          setRows(cached.rows)
          return
        }
      } catch {
        // Falls through to a fresh fetch below.
      }
    }

    const params = new URLSearchParams({ rows: 10, perRow: 15, lang: getLang() })
    fetch(`${BACKEND_URL}/api/products/random-rows?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows)
        try {
          sessionStorage.setItem(PICKED_ROWS_CACHE_KEY, JSON.stringify({ lang: getLang(), rows: data.rows }))
        } catch {
          // Private mode / blocked storage - the next "return from a
          // product" visit just reshuffles too instead of being remembered.
        }
      })
      .catch(() => {})
  }, [])

  if (rows.length === 0) return null

  return (
    <div
      className="picked-products"
      onClickCapture={(e) => {
        // Only an actual product link counts as "leaving to come back" -
        // the carousel's own arrow/dot buttons shouldn't set this, or
        // merely clicking around the carousel (without ever navigating
        // away) would make some later, unrelated return trip wrongly skip
        // the reshuffle too.
        if (e.target.closest('a')) sessionStorage.setItem(PICKED_ROWS_RETURN_FLAG_KEY, '1')
      }}
    >
      <h2 className="picked-products-title">{t('pickedProducts')}</h2>
      {rows.map((row, i) => (
        <section className="newest-products picked-products-row" key={row.id}>
          <ProductCarousel
            items={row.items}
            classPrefix="newest-products"
            maxVisible={5}
            showDots
            autoAdvanceMs={PICKED_INTERVAL_MS}
            autoAdvanceDirection={i % 2 === 0 ? 'right' : 'left'}
          />
        </section>
      ))}
    </div>
  )
}

function CategoryGrid() {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/categories/featured?lang=${getLang()}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .catch(() => {})
  }, [])

  if (items.length === 0) return null

  return (
    <section className="category-grid-section">
      <h2>{t('categories')}</h2>
      <div className="category-grid">
        {items.map((cat) => (
          <Link key={cat.id} to={`/proizvodi?nodeId=${encodeURIComponent(cat.id)}`} className="category-grid-card">
            <div className="category-grid-image">
              <img src={cat.image} alt={cat.name} loading="lazy" />
            </div>
            <h3>{cat.name}</h3>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ContactCta() {
  return (
    <section className="home-contact-cta">
      <img className="home-contact-cta-icon home-contact-cta-icon-left" src="/contact-icon.png" alt="" aria-hidden="true" />
      <h2>{t('homeContactTitle')}</h2>
      <p>{t('homeContactBody')}</p>
      <Link to="/kontakt" className="home-contact-cta-button">
        {t('homeContactButton')}
      </Link>
      <img className="home-contact-cta-icon home-contact-cta-icon-right" src="/contact-icon.png" alt="" aria-hidden="true" />
    </section>
  )
}

// Mirrors ProductGrid's own scroll-position restore (picking a product then
// hitting back returns to the same spot instead of the top) - the home page
// needs its own copy rather than sharing that one since it has no single
// "loading" flag to gate on: CategoryGrid/NewestProducts/PickedRows each
// fetch independently, so the page keeps growing taller for a bit after
// mount, for an amount of time that varies with network/API speed. Rather
// than guessing at fixed delays (which worked sometimes and not others),
// this watches the page's actual height via ResizeObserver and re-applies
// the scroll every time it grows, until it's stopped changing for a beat -
// so it lands right regardless of how long the slowest section takes.
function useHomeScrollRestore() {
  const navigationType = useNavigationType()

  useEffect(() => {
    function handleScroll() {
      sessionStorage.setItem(HOME_SCROLL_KEY, String(window.scrollY))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (navigationType !== 'POP') return
    const saved = sessionStorage.getItem(HOME_SCROLL_KEY)
    if (!saved) return
    const target = parseInt(saved, 10)

    window.scrollTo(0, target)

    let settleTimer = null
    const observer = new ResizeObserver(() => {
      window.scrollTo(0, target)
      clearTimeout(settleTimer)
      settleTimer = setTimeout(() => observer.disconnect(), 400)
    })
    observer.observe(document.body)
    settleTimer = setTimeout(() => observer.disconnect(), 400)
    // Safety net in case something keeps resizing the page indefinitely -
    // never watch forever.
    const maxTimer = setTimeout(() => observer.disconnect(), 5000)

    return () => {
      observer.disconnect()
      clearTimeout(settleTimer)
      clearTimeout(maxTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function Home() {
  useHomeScrollRestore()

  return (
    <div className="home-page">
      <div className="hero-carousel-desktop-only">
        <HeroCarousel variant="desktop" />
      </div>
      <div className="hero-carousel-mobile-only">
        <HeroCarousel variant="mobile" />
      </div>
      <CategoryGrid />
      <NewestProducts />
      <PickedRows />
      <ContactCta />
    </div>
  )
}

export default Home
