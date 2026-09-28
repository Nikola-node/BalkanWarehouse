import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import Home from './components/Home'
import ProductGrid from './components/ProductGrid'
import ProductDetail from './components/ProductDetail'
import Cart from './components/Cart'
import CategoryMenu from './components/CategoryMenu'
import LanguageSwitcher from './components/LanguageSwitcher'
import Footer from './components/Footer'
import LegalPage from './components/LegalPage'
import Contact from './components/Contact'
import OrderResult from './components/OrderResult'
import Admin from './components/Admin'
import NotFound from './components/NotFound'
import { useCart } from './CartContext'
import { useCurrency } from './CurrencyContext'
import { t, getLang } from './i18n'
import { BACKEND_URL } from './config'
import './App.css'

function CartIcon() {
  const { count } = useCart()
  const [pulse, setPulse] = useState(false)
  const prevCount = useRef(count)

  useEffect(() => {
    const increased = count > prevCount.current
    prevCount.current = count
    if (increased) {
      setPulse(true)
      const timeout = setTimeout(() => setPulse(false), 400)
      return () => clearTimeout(timeout)
    }
  }, [count])

  return (
    <Link to="/cart" className={`site-cart ${pulse ? 'site-cart-pulse' : ''}`}>
      <span className="site-cart-icon-wrap">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 8.5h13l-1.1 10.2a1.8 1.8 0 0 1-1.8 1.6H8.4a1.8 1.8 0 0 1-1.8-1.6L5.5 8.5z" />
          <path d="M8.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7" />
        </svg>
        <span className="site-cart-count">{count}</span>
      </span>
    </Link>
  )
}

function SearchBar() {
  const { formatPrice } = useCurrency()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const wrapRef = useRef(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed, lang: getLang() })
      fetch(`${BACKEND_URL}/api/products/suggest?${params}`)
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.items)
          setOpen(true)
          setActiveIndex(-1)
        })
    }, 250)

    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function goToSuggestion(item) {
    setOpen(false)
    setQuery('')
    navigate(`/product/${item.variantIds[0]}`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setOpen(false)
    navigate(`/proizvodi?q=${encodeURIComponent(trimmed)}`)
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      goToSuggestion(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="site-search-wrap" ref={wrapRef}>
      <form className="site-search" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" aria-label={t('search')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="site-search-suggestions">
          {suggestions.map((item, i) => (
            <li key={item.model}>
              <button
                type="button"
                className={`site-search-suggestion ${i === activeIndex ? 'active' : ''}`}
                onClick={() => goToSuggestion(item)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {item.image && <img src={item.image} alt="" />}
                <span className="site-search-suggestion-info">
                  <span className="site-search-suggestion-name">{item.name}</span>
                  <span className="site-search-suggestion-price">
                    {item.maxPrice === 0
                      ? t('priceOnRequest')
                      : item.minPrice === item.maxPrice
                        ? formatPrice(item.minPrice)
                        : `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// A route change is a client-side render, not a real page load, so the
// browser just leaves the window scrolled wherever it already was -
// clicking a product from partway down the grid otherwise lands on the
// product page already scrolled down. Only resets on a fresh navigation
// (PUSH/REPLACE): back/forward (POP) is left alone so ProductGrid's own
// scroll-position restore for the grid it came from still works.
function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  return null
}

function App() {
  return (
    <div>
      <ScrollToTop />
      <header className="site-header">
        <Link to="/" className="site-logo">
          BalkanWarehouse
        </Link>
        <SearchBar />
        <div className="site-header-actions">
          <div className="site-contact-info">
            <a href="tel:+38162625111" className="site-contact-info-item">
              +381 62 625 111
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
            <a href="mailto:info@balkanwarehouse.com" className="site-contact-info-item">
              info@balkanwarehouse.com
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </a>
          </div>
          <CartIcon />
          <LanguageSwitcher />
        </div>
      </header>

      <nav className="site-nav-bar">
        <div className="site-nav-bar-inner">
          <CategoryMenu />
          <Link to="/o-nama" className="site-nav-link">{t('footerAbout')}</Link>
          <Link to="/kontakt" className="site-nav-link">{t('navContact')}</Link>
        </div>
      </nav>

      <main className="site-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/proizvodi" element={<ProductGrid />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/porudzbina/uspesna" element={<OrderResult success />} />
          <Route path="/porudzbina/neuspesna" element={<OrderResult success={false} />} />
          <Route path="/o-nama" element={<LegalPage titleKey="footerAbout" />} />
          <Route path="/uslovi-kupovine" element={<LegalPage titleKey="footerTerms" />} />
          <Route path="/dostava" element={<LegalPage titleKey="footerDelivery" />} />
          <Route path="/nacin-placanja" element={<LegalPage titleKey="footerPayment" />} />
          <Route path="/diskriminacija" element={<LegalPage titleKey="footerDiscrimination" />} />
          <Route path="/politika-privatnosti" element={<LegalPage titleKey="footerPrivacy" />} />
          <Route path="/povracaj-robe" element={<LegalPage titleKey="footerReturns" />} />
          <Route path="/kontakt" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App
