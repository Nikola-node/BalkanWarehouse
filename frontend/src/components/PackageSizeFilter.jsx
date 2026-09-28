import { useEffect, useState } from 'react'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

// Lists every distinct package size (pieces per package) across the whole
// catalog - picking one shows only products that ship in that size,
// mirroring how CategoryFilterTree lists every category up front rather
// than only the ones matching other active filters.
function PackageSizeFilter({ packageSize, onSelect }) {
  const [sizes, setSizes] = useState([])
  const [sectionOpen, setSectionOpen] = useState(true)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/package-sizes`)
      .then((res) => res.json())
      .then((data) => setSizes(data.items))
      .catch(() => {})
  }, [])

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
