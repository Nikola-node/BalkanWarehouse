import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import ProductGrid from './components/ProductGrid'
import ProductDetail from './components/ProductDetail'
import Cart from './components/Cart'
import CategoryMenu from './components/CategoryMenu'
import { useCart } from './CartContext'
import { t } from './i18n'
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
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span className="site-cart-count">{count}</span>
    </Link>
  )
}

function App() {
  return (
    <div>
      <header className="site-header">
        <Link to="/" className="site-logo">
          WebShop
        </Link>
        <div className="site-search">
          <input type="text" placeholder={t('search')} disabled />
          <button type="button" disabled aria-label={t('search')}>
            🔍
          </button>
        </div>
        <CartIcon />
      </header>

      <nav className="site-nav-bar">
        <CategoryMenu />
      </nav>

      <main className="site-content">
        <Routes>
          <Route path="/" element={<ProductGrid />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
