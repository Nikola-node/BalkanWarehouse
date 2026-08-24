import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'
import ProductCard from './ProductCard'
import Pagination from './Pagination'

const PAGE_SIZE = 32 // 4 columns x 8 rows

function ProductGrid() {
  const [searchParams, setSearchParams] = useSearchParams()
  const nodeId = searchParams.get('nodeId') || ''
  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: PAGE_SIZE })
    if (nodeId) params.set('nodeId', nodeId)
    if (q) params.set('q', q)
    fetch(`${BACKEND_URL}/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setFilter(data.filter)
        setLoading(false)
      })
  }, [nodeId, q, page])

  function clearFilters() {
    setSearchParams({})
  }

  function goToPage(nextPage) {
    const next = { page: String(nextPage) }
    if (nodeId) next.nodeId = nodeId
    if (q) next.q = q
    setSearchParams(next)
  }

  return (
    <div>
      {filter && (
        <button type="button" className="active-filter-clear" onClick={clearFilters}>
          {filter.type === 'search' ? `${t('searchResultsFor')} "${filter.query}"` : filter.name} ×
        </button>
      )}

      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <>
          <div className="product-grid">
            {items.map((product) => (
              <ProductCard product={product} key={product.model} />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  )
}

export default ProductGrid
