import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { useCurrency } from '../CurrencyContext'
import CategoryFilterTree from './CategoryFilterTree'

// minPrice/maxPrice arrive from (and are sent back to) the URL/backend in
// EUR - Promobox prices are compared in EUR - but the customer should only
// ever see and type RSD, so every value crossing that boundary gets
// converted right here rather than the backend needing to know about RSD.
function FilterSidebar({ nodeId = '', minPrice, maxPrice, inStock, onChange }) {
  const { eurFromRsd, rsdFromEur } = useCurrency()
  const [minInput, setMinInput] = useState(minPrice ? Math.round(rsdFromEur(minPrice)) : minPrice)
  const [maxInput, setMaxInput] = useState(maxPrice ? Math.round(rsdFromEur(maxPrice)) : maxPrice)

  const activeFilterCount = (nodeId ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (inStock ? 1 : 0)

  function resetAll() {
    onChange({ nodeId: '', minPrice: '', maxPrice: '', inStock: false })
  }

  useEffect(() => {
    setMinInput(minPrice ? Math.round(rsdFromEur(minPrice)) : minPrice)
    setMaxInput(maxPrice ? Math.round(rsdFromEur(maxPrice)) : maxPrice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice])

  function applyPriceRange() {
    onChange({
      minPrice: minInput ? Math.round(eurFromRsd(minInput) * 100) / 100 : '',
      maxPrice: maxInput ? Math.round(eurFromRsd(maxInput) * 100) / 100 : '',
    })
  }

  function handlePriceKeyDown(e) {
    if (e.key === 'Enter') applyPriceRange()
  }

  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h3>{t('filters')}</h3>
        {activeFilterCount > 0 && (
          <button type="button" className="filter-sidebar-reset" onClick={resetAll}>
            {t('resetAll')} ({activeFilterCount})
          </button>
        )}
      </div>

      <CategoryFilterTree nodeId={nodeId} onSelect={(id) => onChange({ nodeId: id })} />

      <div className="filter-sidebar-section">
        <h4>{t('priceRange')}</h4>
        <div className="filter-sidebar-price">
          <input
            type="number"
            min="0"
            placeholder={t('priceFrom')}
            value={minInput ?? ''}
            onChange={(e) => setMinInput(e.target.value)}
            onKeyDown={handlePriceKeyDown}
            onBlur={applyPriceRange}
          />
          <span>-</span>
          <input
            type="number"
            min="0"
            placeholder={t('priceTo')}
            value={maxInput ?? ''}
            onChange={(e) => setMaxInput(e.target.value)}
            onKeyDown={handlePriceKeyDown}
            onBlur={applyPriceRange}
          />
        </div>
      </div>

      <div className="filter-sidebar-section">
        <label className="filter-sidebar-checkbox">
          <input type="checkbox" checked={inStock} onChange={(e) => onChange({ inStock: e.target.checked })} />
          {t('inStockOnly')}
        </label>
      </div>
    </aside>
  )
}

export default FilterSidebar
