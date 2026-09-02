import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { swatchColor } from '../colorSwatch'
import { useCurrency } from '../CurrencyContext'

const VISIBLE_COLORS = 4

function ProductCard({ product, isNew, eager = false }) {
  const { formatPrice } = useCurrency()
  const extraColors = product.colors.length - VISIBLE_COLORS
  // Carousels only ever hold a small, bounded set of cards and are meant to
  // be slid through immediately, so native lazy-loading backfires there -
  // it defers a card's image until it's scrolled into view, which is too
  // late to avoid a blank flash. The much larger product grid still lazy
  // loads, where it actually saves bandwidth.
  const loading = eager ? 'eager' : 'lazy'

  return (
    <Link to={`/product/${product.variantIds[0]}`} className="product-card">
      <div className="product-card-image">
        {isNew && <span className="product-card-badge">NEW</span>}
        {product.image && <img src={product.image} alt={product.name} loading={loading} />}
        {product.imageHover && (
          <img className="product-card-image-hover" src={product.imageHover} alt="" loading={loading} />
        )}
      </div>

      {product.code && <p className="product-card-code">{product.code}</p>}
      <h3>{product.model}</h3>
      {product.description && <p className="product-card-description">{product.description}</p>}

      <div className="product-card-colors">
        {product.colors.slice(0, VISIBLE_COLORS).map((c) => (
          <span
            key={c.id}
            className="product-card-swatch"
            style={{ backgroundColor: swatchColor(c.id, c.htmlColor) }}
            title={c.name}
          />
        ))}
        {extraColors > 0 && <span className="product-card-more-colors">+{extraColors} {t('more')}</span>}
      </div>

      <div className="product-card-stock">
        <span className={`product-card-stock-dot ${product.inStock ? 'in' : 'out'}`} />
        <div>
          <div className={product.inStock ? 'stock-in' : 'stock-out'}>
            {product.inStock ? t('inStock') : t('outOfStock')}
          </div>
          <div className="product-card-stock-qty">
            {product.inStock ? product.stockQty.toLocaleString('sr-RS') : ''}
          </div>
        </div>
      </div>

      <div className="product-card-price-row">
        <span className="product-card-price-label">{t('price')}</span>
        <span className="product-card-price">
          {product.maxPrice === 0
            ? t('priceOnRequest')
            : product.minPrice === product.maxPrice
              ? formatPrice(product.minPrice)
              : `${formatPrice(product.minPrice)} - ${formatPrice(product.maxPrice)}`}
        </span>
      </div>
    </Link>
  )
}

export default ProductCard
