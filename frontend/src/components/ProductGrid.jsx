import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

const PAGE_SIZE = 24

function ProductGrid() {
  const [searchParams, setSearchParams] = useSearchParams()
  const nodeId = searchParams.get('nodeId') || ''
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [items, setItems] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: PAGE_SIZE })
    if (nodeId) params.set('nodeId', nodeId)
    fetch(`${BACKEND_URL}/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items)
        setTotalPages(data.totalPages)
        setFilter(data.filter)
        setLoading(false)
      })
  }, [nodeId, page])

  function clearFilters() {
    setSearchParams({})
  }

  function goToPage(nextPage) {
    const next = { page: String(nextPage) }
    if (nodeId) next.nodeId = nodeId
    setSearchParams(next)
  }

  return (
    <div>
      {filter && (
        <button type="button" className="active-filter-clear" onClick={clearFilters}>
          {filter.name} ×
        </button>
      )}

      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <>
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
            <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              {t('previous')}
            </button>
            <span>
              {t('page')} {page} {t('of')} {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              {t('next')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ProductGrid
