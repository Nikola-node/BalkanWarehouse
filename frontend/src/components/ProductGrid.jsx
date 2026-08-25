import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t, getLang } from '../i18n'
import ProductCard from './ProductCard'
import Pagination from './Pagination'
import SortBar from './SortBar'
import FilterSidebar from './FilterSidebar'

const PAGE_SIZE = 32 // 4 columns x 8 rows

function ProductGrid() {
  const [searchParams, setSearchParams] = useSearchParams()
  const nodeId = searchParams.get('nodeId') || ''
  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'date_desc'
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const inStock = searchParams.get('inStock') === '1'
  const technique = (searchParams.get('technique') || '').split(',').filter(Boolean)
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)
  const [techniqueFacets, setTechniqueFacets] = useState([])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: PAGE_SIZE, sort, lang: getLang() })
    if (nodeId) params.set('nodeId', nodeId)
    if (q) params.set('q', q)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (inStock) params.set('inStock', '1')
    if (technique.length > 0) params.set('technique', technique.join(','))
    fetch(`${BACKEND_URL}/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setFilter(data.filter)
        setTechniqueFacets(data.techniqueFacets)
        setLoading(false)
      })
  }, [nodeId, q, sort, minPrice, maxPrice, inStock, technique.join(','), page])

  function baseParams() {
    const next = {}
    if (nodeId) next.nodeId = nodeId
    if (q) next.q = q
    if (sort) next.sort = sort
    if (minPrice) next.minPrice = minPrice
    if (maxPrice) next.maxPrice = maxPrice
    if (inStock) next.inStock = '1'
    if (technique.length > 0) next.technique = technique.join(',')
    return next
  }

  function clearFilters() {
    setSearchParams({})
  }

  function goToPage(nextPage) {
    setSearchParams({ ...baseParams(), page: String(nextPage) })
  }

  function updateFilters(changes) {
    const next = { ...baseParams(), page: '1' }
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined || value === false || value == null) {
        delete next[key]
      } else if (value === true) {
        next[key] = '1'
      } else {
        next[key] = String(value)
      }
    }
    setSearchParams(next)
  }

  return (
    <div>
      {filter?.type === 'search' && (
        <button type="button" className="active-filter-clear" onClick={clearFilters}>
          {t('searchResultsFor')} "{filter.query}" ×
        </button>
      )}

      <SortBar sort={sort} onChange={updateFilters} />

      <div className="product-page">
        <FilterSidebar
          nodeId={nodeId}
          minPrice={minPrice}
          maxPrice={maxPrice}
          inStock={inStock}
          technique={technique}
          techniqueFacets={techniqueFacets}
          onChange={updateFilters}
        />

        <div className="product-main">
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
      </div>
    </div>
  )
}

export default ProductGrid
