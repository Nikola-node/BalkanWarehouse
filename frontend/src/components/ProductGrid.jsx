import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

const PAGE_SIZE = 24

function ProductGrid() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${BACKEND_URL}/api/products?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items)
        setTotalPages(data.totalPages)
        setLoading(false)
      })
  }, [page])

  if (loading) {
    return <p>{t('loading')}</p>
  }

  return (
    <div>
      <div className="product-grid">
        {items.map((product) => (
          <Link
            to={`/product/${product.variantIds[0]}`}
            className="product-card"
            key={product.model}
          >
            <h3>{product.name}</h3>
            <p>
              {product.minPrice === product.maxPrice
                ? `€${product.minPrice.toFixed(2)}`
                : `${t('from')} €${product.minPrice.toFixed(2)}`}
            </p>
          </Link>
        ))}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          {t('previous')}
        </button>
        <span>
          {t('page')} {page} {t('of')} {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          {t('next')}
        </button>
      </div>
    </div>
  )
}

export default ProductGrid
