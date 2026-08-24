import { t } from '../i18n'

const WINDOW_SIZE = 10

function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (total === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  let windowStart = Math.max(1, page - Math.floor(WINDOW_SIZE / 2))
  const windowEnd = Math.min(totalPages, windowStart + WINDOW_SIZE - 1)
  windowStart = Math.max(1, windowEnd - WINDOW_SIZE + 1)
  const pages = []
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p)

  return (
    <div className="pagination">
      <span className="pagination-range">
        {start} - {end} {t('of')} {total} {t('results')}
      </span>

      <div className="pagination-pages">
        <button
          type="button"
          className="pagination-arrow"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('previous')}
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination-page ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="pagination-arrow"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('next')}
        >
          ›
        </button>
        <button
          type="button"
          className="pagination-arrow"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label={t('lastPage')}
        >
          »
        </button>
      </div>
    </div>
  )
}

export default Pagination
