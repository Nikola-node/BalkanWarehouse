import { useEffect, useState } from 'react'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

// Lists every distinct package size (pieces per package) among products
// matching the *other* currently active filters - unlike CategoryFilterTree
// (which always lists every category up front), this one has to be rescoped
// live: a wrong/global count here used to show sizes with zero matches once
// a category was picked, so picking them visibly returned nothing.
function PackageSizeFilter({ nodeId, minPrice, maxPrice, inStock, packageSize, onSelect }) {
  const [sizes, setSizes] = useState([])
  const [sectionOpen, setSectionOpen] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (nodeId) params.set('nodeId', nodeId)
    if (minPrice != null && minPrice !== '') params.set('minPrice', minPrice)
    if (maxPrice != null && maxPrice !== '') params.set('maxPrice', maxPrice)
    if (inStock) params.set('inStock', '1')

    fetch(`${BACKEND_URL}/api/package-sizes?${params}`)
      .then((res) => res.json())
      .then((data) => setSizes(data.items))
      .catch(() => {})
  }, [nodeId, minPrice, maxPrice, inStock])

  if (sizes.length === 0) return null

  return (
    <div className="filter-sidebar-section">
      <button type="button" className="filter-sidebar-toggle" onClick={() => setSectionOpen(!sectionOpen)}>
        {t('packageSize')}
        <span className={`filter-sidebar-caret ${sectionOpen ? 'open' : ''}`}>⌄</span>
      </button>
      {sectionOpen && (
        <ul className="package-size-list">
          {sizes.map(({ size, count }) => {
            const active = String(size) === packageSize
            return (
              <li key={size}>
                <button
                  type="button"
                  className={`package-size-option ${active ? 'active' : ''}`}
                  onClick={() => onSelect(active ? '' : size)}
                >
                  {size} {t('packageSizeUnit')} <span className="category-filter-count">({count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default PackageSizeFilter
