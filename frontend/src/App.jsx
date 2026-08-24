import { Link, Route, Routes } from 'react-router-dom'
import ProductGrid from './components/ProductGrid'
import ProductDetail from './components/ProductDetail'
import './App.css'

function App() {
  return (
    <div>
      <header className="site-header">
        <Link to="/" className="site-logo">
          WebShop
        </Link>
      </header>

      <main className="site-content">
        <Routes>
          <Route path="/" element={<ProductGrid />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
