import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState('')
  const [specsOpen, setSpecsOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setActiveImage(0)
    setSpecsOpen(false)
    fetch(`${BACKEND_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data)
        setSelectedSize(data.Size?.Id || '')
        setLoading(false)
      })
  }, [id])

  if (loading || !product) {
    return <p>{t('loading')}</p>
  }

  const images = product.Images || []
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))]
  const inStock = (product.Stocks || []).some((s) => s.Qty > 0)

  // One entry per distinct color, first variant seen used as its representative.
  const colors = []
  const seenColors = new Set()
  for (const v of product.variants) {
    if (v.color && !seenColors.has(v.color)) {
      seenColors.add(v.color)
      colors.push(v)
    }
  }

  function selectColor(color) {
    const sameColor = product.variants.filter((v) => v.color === color)
    const match = sameColor.find((v) => v.size === selectedSize) || sameColor[0]
    navigate(`/product/${match.id}`)
  }

  function selectSize(size) {
    setSelectedSize(size)
    const currentColor = product.Color?.Id
    const match =
      product.variants.find((v) => v.size === size && v.color === currentColor) ||
      product.variants.find((v) => v.size === size)
    if (match && match.id !== id) {
      navigate(`/product/${match.id}`)
    }
  }

  return (
    <>
    <div className="product-detail">
      <div className="product-gallery">
        <img
          className="product-gallery-main"
          src={images[activeImage]?.Image}
          alt={product.Name}
        />
        {images.length > 1 && (
          <div className="product-gallery-thumbs">
            {images.map((img, i) => (
              <img
                key={img.No}
                src={img.Image}
                alt=""
                className={i === activeImage ? 'active' : ''}
                onClick={() => setActiveImage(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <h1>{product.Model?.Name}</h1>
        <p className="product-code">
          {product.ProductIdView} - {product.Color?.Name?.toUpperCase()}
        </p>
        {product.Model?.Description && (
          <p className="product-short-desc">{product.Model.Description}</p>
        )}
        <p className="product-price">€{product.Price.toFixed(2)}</p>
        <p className={inStock ? 'stock-in' : 'stock-out'}>
          {inStock ? t('inStock') : t('outOfStock')}
        </p>

        {colors.length > 1 && (
          <div className="product-field">
            {t('color')}
            <div className="color-swatches">
              {colors.map((v) => (
                <button
                  key={v.color}
                  type="button"
                  className={`color-swatch ${v.color === product.Color?.Id ? 'active' : ''}`}
                  onClick={() => selectColor(v.color)}
                  title={v.colorName}
                >
                  <span
                    className="color-swatch-dot"
                    style={{ backgroundColor: v.htmlColor || '#ccc' }}
                  />
                  {v.colorName}
                </button>
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <label className="product-field">
            {t('size')}
            <select value={selectedSize} onChange={(e) => selectSize(e.target.value)}>
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="product-field">
          {t('quantity')}
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>

        <button className="add-to-cart">{t('addToCart')}</button>

        {product.Specifications?.length > 0 && (
          <div className="accordion">
            <button
              type="button"
              className="accordion-toggle"
              onClick={() => setSpecsOpen((open) => !open)}
            >
              <span className="accordion-icon">{specsOpen ? '−' : '+'}</span>
              {t('specification')}
            </button>
            {specsOpen && (
              <ul className="product-specs">
                {product.Specifications.map((spec) => (
                  <li key={spec.Id}>
                    <strong>{spec.Name}:</strong> {spec.Value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>

    {product.Model?.Description2 && (
      <div className="product-description">
        <h2>{t('description')}</h2>
        <p>{product.Model.Description2}</p>
      </div>
    )}
    </>
  )
}

export default ProductDetail
