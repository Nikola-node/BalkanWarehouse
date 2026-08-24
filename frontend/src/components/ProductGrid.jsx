import { useEffect, useState } from 'react'
import { BACKEND_URL } from '../config'

const PAGE_SIZE = 24

function ProductGrid() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${BACKEND_URL}/api/products?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items)
        setTotalPages(data.totalPages)
        setLoading(false)
      })
  }, [page])

  if (loading) {
    return <p>Loading products...</p>
  }

  return (
    <div>
      <div className="product-grid">
        {items.map((product) => (
          <div className="product-card" key={product.model}>
            <h3>{product.name}</h3>
            <p>
              {product.minPrice === product.maxPrice
                ? `€${product.minPrice.toFixed(2)}`
                : `from €${product.minPrice.toFixed(2)}`}
            </p>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

export default ProductGrid
