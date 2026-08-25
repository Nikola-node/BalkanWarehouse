import { t } from '../i18n'

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'sortNewest' },
  { value: 'date_asc', label: 'sortOldest' },
  { value: 'name_asc', label: 'sortNameAsc' },
  { value: 'name_desc', label: 'sortNameDesc' },
  { value: 'price_asc', label: 'sortPriceAsc' },
  { value: 'price_desc', label: 'sortPriceDesc' },
  { value: 'stock_asc', label: 'sortStockAsc' },
  { value: 'stock_desc', label: 'sortStockDesc' },
]

function SortBar({ sort, onChange }) {
  return (
    <div className="sort-bar">
      <label className="sort-bar-field">
        {t('sortBy')}
        <select value={sort} onChange={(e) => onChange({ sort: e.target.value })}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.label)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default SortBar
