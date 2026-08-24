import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setLoading(true)
    setActiveImage(0)
    fetch(`${BACKEND_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data)
        setLoading(false)
      })
  }, [id])

  if (loading || !product) {
    return <p>{t('loading')}</p>
  }

  const images = product.Images || []
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))]
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))]
  const inStock = (product.Stocks || []).some((s) => s.Qty > 0)

  return (
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
        <h1>{product.Name}</h1>
        <p className="product-price">
          {t('price')}: €{product.Price.toFixed(2)}
        </p>
        <p className={inStock ? 'stock-in' : 'stock-out'}>
          {inStock ? t('inStock') : t('outOfStock')}
        </p>

        {sizes.length > 0 && (
          <label className="product-field">
            {t('size')}
            <select defaultValue={sizes[0]}>
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        {colors.length > 1 && (
          <p className="product-colors">Dostupne boje: {colors.join(', ')}</p>
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

        {product.Model?.Description2 && (
          <div className="product-description">
            <h2>{t('description')}</h2>
            <p>{product.Model.Description2}</p>
          </div>
        )}

        {product.Specifications?.length > 0 && (
          <ul className="product-specs">
            {product.Specifications.map((spec) => (
              <li key={spec.Id}>
                <strong>{spec.Name}:</strong> {spec.Value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
