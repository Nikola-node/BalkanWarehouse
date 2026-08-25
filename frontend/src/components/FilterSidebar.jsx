import { useEffect, useState } from 'react'
import { t } from '../i18n'
import CategoryFilterTree from './CategoryFilterTree'

function FilterSidebar({ nodeId = '', minPrice, maxPrice, inStock, technique, techniqueFacets, onChange }) {
  const [minInput, setMinInput] = useState(minPrice)
  const [maxInput, setMaxInput] = useState(maxPrice)
  const [printOpen, setPrintOpen] = useState(true)

  const activeFilterCount =
    (nodeId ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (inStock ? 1 : 0) + (technique.length > 0 ? 1 : 0)

  function resetAll() {
    onChange({ nodeId: '', minPrice: '', maxPrice: '', inStock: false, technique: '' })
  }

  useEffect(() => {
    setMinInput(minPrice)
    setMaxInput(maxPrice)
  }, [minPrice, maxPrice])

  function applyPriceRange() {
    onChange({ minPrice: minInput, maxPrice: maxInput })
  }

  function handlePriceKeyDown(e) {
    if (e.key === 'Enter') applyPriceRange()
  }

  function toggleTechnique(id) {
    const selected = new Set(technique)
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    onChange({ technique: [...selected].join(',') })
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

      {techniqueFacets.length > 0 && (
        <div className="filter-sidebar-section">
          <button type="button" className="filter-sidebar-toggle" onClick={() => setPrintOpen(!printOpen)}>
            {t('printTechnique')}
            <span className={`filter-sidebar-caret ${printOpen ? 'open' : ''}`}>⌄</span>
          </button>
          {printOpen && (
            <ul className="filter-sidebar-list">
              {techniqueFacets.map((f) => (
                <li key={f.id}>
                  <label>
                    <input type="checkbox" checked={technique.includes(f.id)} onChange={() => toggleTechnique(f.id)} />
                    <span className="filter-sidebar-list-name">{f.name}</span>
                    <span className="filter-sidebar-count">({f.count})</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}

export default FilterSidebar
