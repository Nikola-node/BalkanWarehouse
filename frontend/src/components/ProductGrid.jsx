import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useLocation, useNavigationType } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t, getLang } from '../i18n'
import ProductCard from './ProductCard'
import Pagination from './Pagination'
import SortBar from './SortBar'
import FilterSidebar from './FilterSidebar'

const PAGE_SIZE = 32 // 4 columns x 8 rows
const SCROLL_KEY_PREFIX = 'scroll:'

function ProductGrid() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const nodeId = searchParams.get('nodeId') || ''
  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'date_desc'
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const inStock = searchParams.get('inStock') === '1'
  const packageSize = searchParams.get('packageSize') || ''
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)
  // Only ever matters on mobile - the "Filteri" pill next to the sort
  // dropdown toggles it, and CSS keeps the filter panel always visible on
  // desktop regardless of its value there.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const gridTopRef = useRef(null)

  const activeFilterCount =
    (nodeId ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (inStock ? 1 : 0) + (packageSize ? 1 : 0)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: PAGE_SIZE, sort, lang: getLang() })
    if (nodeId) params.set('nodeId', nodeId)
    if (q) params.set('q', q)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (inStock) params.set('inStock', '1')
    if (packageSize) params.set('packageSize', packageSize)
    fetch(`${BACKEND_URL}/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setFilter(data.filter)
        setLoading(false)
      })
  }, [nodeId, q, sort, minPrice, maxPrice, inStock, packageSize, page])

  // Remembers how far down this exact page (same filters/page number) was
  // scrolled, so clicking a product then hitting the browser back button
  // returns to the same spot instead of the top of the grid.
  useEffect(() => {
    const key = SCROLL_KEY_PREFIX + location.pathname + location.search
    function handleScroll() {
      sessionStorage.setItem(key, String(window.scrollY))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname, location.search])

  // Only restores on browser back/forward (not on a fresh link click, which
  // should land at the top), and only once the grid has actually rendered -
  // restoring before that would have nothing tall enough to scroll into.
  useEffect(() => {
    if (loading || navigationType !== 'POP') return
    const key = SCROLL_KEY_PREFIX + location.pathname + location.search
    const saved = sessionStorage.getItem(key)
    if (!saved) return
    const id = requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)))
    return () => cancelAnimationFrame(id)
  }, [loading, navigationType, location.pathname, location.search])

  function baseParams() {
    const next = {}
    if (nodeId) next.nodeId = nodeId
    if (q) next.q = q
    if (sort) next.sort = sort
    if (minPrice) next.minPrice = minPrice
    if (maxPrice) next.maxPrice = maxPrice
    if (inStock) next.inStock = '1'
    if (packageSize) next.packageSize = packageSize
    return next
  }

  // Changing filters/sort/page swaps the grid's contents in place - without
  // this, someone scrolled halfway down could click a filter and not notice
  // the results changed above/below what they're currently looking at.
  function scrollToGridTop() {
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function clearFilters() {
    setSearchParams({})
    scrollToGridTop()
  }

  function goToPage(nextPage) {
    setSearchParams({ ...baseParams(), page: String(nextPage) })
    scrollToGridTop()
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
    scrollToGridTop()
  }

  return (
    <div>
      {filter?.type === 'search' && (
        <button type="button" className="active-filter-clear" onClick={clearFilters}>
          {t('searchResultsFor')} "{filter.query}" ×
        </button>
      )}

      <div className="product-toolbar">
        <button
          type="button"
          className="mobile-filter-toggle"
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="6" r="2" fill="currentColor" />
            <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8" cy="14" r="2" fill="currentColor" />
          </svg>
          {t('filters')}
          {activeFilterCount > 0 && <span className="mobile-filter-toggle-count">{activeFilterCount}</span>}
        </button>

        <SortBar sort={sort} onChange={updateFilters} />
      </div>

      <div ref={gridTopRef} className="product-page">
        <FilterSidebar
          nodeId={nodeId}
          minPrice={minPrice}
          maxPrice={maxPrice}
          inStock={inStock}
          packageSize={packageSize}
          mobileOpen={mobileFiltersOpen}
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
