import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from './CartContext.jsx'
import { CurrencyProvider } from './CurrencyContext.jsx'
import './index.css'
import App from './App.jsx'

// The browser's own scroll restoration otherwise fights with ProductGrid's
// manual save/restore (App.jsx renders on top of a pushState-based router,
// and native restoration can re-apply itself on its own timing and undo
// our explicit scrollTo). Managing it ourselves avoids that race entirely.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// One-time cleanup: the admin page used to persist its session token here
// so it stayed logged in across visits, which turned out to not be wanted -
// it now keeps that token in memory only, so this leftover key from before
// that change is dead and just needs removing.
localStorage.removeItem('balkanwarehouse-admin-token')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CurrencyProvider>
    </BrowserRouter>
  </StrictMode>,
)
