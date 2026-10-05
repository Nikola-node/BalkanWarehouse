import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { BACKEND_URL } from '../config'
import { t, getLang } from '../i18n'
import { useCart } from '../CartContext'
import { useCurrency } from '../CurrencyContext'
import { canFormQuantity, parsePackageSizes } from '../packageQuantity'
import { swatchColor } from '../colorSwatch'
import PrintNotice from './PrintNotice'
import ProductCarousel from './ProductCarousel'

const LENS_SIZE = 200
const LENS_ZOOM = 2.2

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, items: cartItems } = useCart()
  const { formatPrice, formatPriceExclVat } = useCurrency()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  // Kept as the raw typed string rather than a Number - converting on every
  // keystroke made a controlled number input flash a leading "0" while the
  // field was being cleared and retyped (e.g. clearing to type "5" briefly
  // set the value to 0, which then showed as "05" until the next keystroke).
  const [quantity, setQuantity] = useState('1')
  const [selectedSize, setSelectedSize] = useState('')
  const [specsOpen, setSpecsOpen] = useState(true)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [lens, setLens] = useState(null)
  // The image's real pixel dimensions - needed because `object-fit: contain`
  // inside the square gallery box lets non-square photos (a pen, a scarf)
  // render with blank letterboxing on two sides. Without knowing the real
  // aspect ratio, the magnifier would zoom into the whole square box as if
  // the photo filled it edge to edge, so on a letterboxed photo the zoomed
  // circle shows mostly blank space instead of the product.
  const [naturalSize, setNaturalSize] = useState(null)
  // The src of the most recently *finished* loading the main photo - used to
  // derive whether the currently-desired photo is already showing, instead
  // of a plain loaded/not-loaded flag that would hide the image on every
  // variant switch even when the new variant reuses the exact same photo
  // (e.g. switching size within the same color) and the <img> tag's src
  // never actually changes, so no fresh load event would ever come along to
  // reveal it again.
  const [loadedSrc, setLoadedSrc] = useState(null)
  const [similar, setSimilar] = useState([])
  // Whether the gallery is hovered or keyboard-focused - arrow keys only
  // change the slide while one of those is true, so they don't hijack
  // ArrowLeft/Right while the user is, say, typing in an unrelated field.
  const [galleryActive, setGalleryActive] = useState(false)
  const mainImageRef = useRef(null)
  // `slides` (the gallery item list) isn't computed until after the
  // loading/not-found early return below, but this effect has to be
  // declared before that return - so its length is tracked here instead of
  // being a dependency, updated each render once `slides` does exist.
  const slidesLengthRef = useRef(0)

  useEffect(() => {
    if (!galleryActive) return
    function handleKeyDown(e) {
      const length = slidesLengthRef.current
      if (length <= 1) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveImage((i) => (i - 1 + length) % length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveImage((i) => (i + 1) % length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [galleryActive])

  // Keeps showing the previous variant's page while the new one loads,
  // instead of blanking everything back to a bare loading message - the
  // gallery, description, specs, documentation and similar products rarely
  // change between a model's own color/size variants, so there's no reason
  // for them to disappear and reappear on every swatch click. `cancelled`
  // guards against an older request (e.g. from a color clicked a moment ago)
  // resolving after a newer one and overwriting it with stale data.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${BACKEND_URL}/api/products/${id}?lang=${getLang()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setSelectedSize(data.Size?.Id || '')
        setActiveImage(0)
        setSpecsOpen(true)
        setDescriptionOpen(false)
        setDocsOpen(false)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    fetch(`${BACKEND_URL}/api/products/${id}/similar?lang=${getLang()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSimilar(data.items)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // The natural dimensions belong to whichever photo is currently shown -
  // stale dimensions from the previous photo would misalign the magnifier
  // until the new photo's onLoad fires.
  useEffect(() => {
    setNaturalSize(null)
    setLens(null)
  }, [activeImage, id])

  if (!product) {
    return <p>{t('loading')}</p>
  }

  const images = product.Images || []
  // The video (when the product has one) is appended as one more browsable
  // gallery slide rather than a separate section further down the page, so
  // it's discoverable right next to the price/add-to-cart like any photo.
  const slides = [
    ...images.map((img) => ({ type: 'image', key: img.No, src: img.Image })),
    ...(product.videoUrl
      ? [{ type: 'video', key: 'video', url: product.videoUrl, aspectPercent: product.videoAspectPercent }]
      : []),
  ]
  const activeSlide = slides[activeImage]
  slidesLengthRef.current = slides.length
  // Derived rather than tracked as its own reset-on-change state: comparing
  // against the last src that actually finished loading means a variant
  // switch that reuses the same photo (e.g. a size change within one color)
  // reads as already-loaded immediately, since the <img> tag's src never
  // changes and so never fires a fresh load event to reveal it again.
  const imageLoaded = activeSlide?.type === 'image' && loadedSrc === activeSlide.src
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))]
  const currentVariant = product.variants.find((v) => String(v.id) === String(product.Id))
  const availableQty = currentVariant
    ? currentVariant.stockQty
    : (product.Stocks || []).reduce((sum, s) => sum + (s.Qty || 0), 0)
  const inStock = availableQty > 0

  // One entry per distinct color, first variant seen used as its representative.
  const colors = []
  const seenColors = new Set()
  for (const v of product.variants) {
    if (v.color && !seenColors.has(v.color)) {
      seenColors.add(v.color)
      colors.push(v)
    }
  }

  // Stock per color, summed across every size that color comes in - a
  // color with multiple sizes should show its combined stock, not just
  // whichever size variant happened to be listed first.
  const stockByColor = []
  const stockByColorIndex = new Map()
  for (const v of product.variants) {
    if (!v.color) continue
    let entry = stockByColorIndex.get(v.color)
    if (!entry) {
      entry = { color: v.color, colorName: v.colorName, htmlColor: v.htmlColor, code: v.code, stockQty: 0 }
      stockByColorIndex.set(v.color, entry)
      stockByColor.push(entry)
    }
    entry.stockQty += v.stockQty || 0
  }
  const totalStockQty = stockByColor.reduce((sum, c) => sum + c.stockQty, 0)

  function selectColor(color) {
    const sameColor = product.variants.filter((v) => v.color === color)
    const match = sameColor.find((v) => v.size === selectedSize) || sameColor[0]
    navigate(`/product/${match.id}`)
  }

  function handleAddToCart() {
    const qty = parseInt(quantity, 10)
    const inCartQty = cartItems.find((i) => i.id === product.Id)?.quantity || 0
    if (!inStock) return
    if (inCartQty + qty > availableQty) {
      Swal.fire({
        icon: 'error',
        text: `${t('stockLimit')} ${availableQty} ${t('pieces')}`,
        confirmButtonText: 'OK',
        confirmButtonColor: '#111111',
      })
      return
    }
    // PackageInfo is what's actually shown to the customer as the "Pakovanje"
    // spec (backend/server.js builds that spec from PackageInfo, not Package),
    // so validation must key off the same field - Package can carry a third,
    // unrelated segment (e.g. "1000/100/1" vs a PackageInfo of "1000/50") that
    // silently disagreed with what the customer sees on the page.
    const packageSizes = parsePackageSizes(product.PackageInfo || product.Package)
    if (!canFormQuantity(qty, packageSizes)) {
      Swal.fire({
        icon: 'error',
        text:
          packageSizes.length > 0
            ? `${t('invalidQuantityPrefix')} ${[...packageSizes].sort((a, b) => a - b).join(', ')} ${t('pieces')}`
            : t('invalidQuantity'),
        confirmButtonText: 'OK',
        confirmButtonColor: '#111111',
      })
      return
    }

    addItem({
      id: product.Id,
      code: product.ProductIdView,
      model: product.Model?.Name,
      name: product.Model?.Name,
      colorName: product.Shade?.Name || product.Color?.Name,
      size: product.Size?.Id || selectedSize,
      price: product.Price,
      image: images[0]?.Image,
      quantity: qty,
      stockQty: availableQty,
    })
    Swal.fire({
      icon: 'success',
      text: t('addedToCart'),
      confirmButtonText: 'OK',
      confirmButtonColor: '#111111',
    })
  }

  function selectSize(size) {
    setSelectedSize(size)
    const currentColor = product.Shade?.Id
    const match =
      product.variants.find((v) => v.size === size && v.color === currentColor) ||
      product.variants.find((v) => v.size === size)
    if (match && match.id !== id) {
      navigate(`/product/${match.id}`)
    }
  }

  function prevImage() {
    setActiveImage((i) => (i - 1 + slides.length) % slides.length)
  }

  function nextImage() {
    setActiveImage((i) => (i + 1) % slides.length)
  }

  function handleMainImageLoad(e) {
    setNaturalSize({ width: e.target.naturalWidth, height: e.target.naturalHeight })
    setLoadedSrc(e.target.src)
  }

  // No more visible arrow buttons - clicking the left half of the photo
  // goes back a slide, the right half goes forward, the same way a photo
  // viewer typically works.
  function handleImageClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    if (clickX < rect.width / 2) {
      prevImage()
    } else {
      nextImage()
    }
  }

  // Tracks the cursor over the main image to drive the magnifier. The image
  // box is always a square, but `object-fit: contain` shrinks a non-square
  // photo to fit inside it, leaving blank letterboxing on two sides - so
  // this first works out where the actual photo sits within that square
  // (`contentWidth/Height` + its offset) using the real image dimensions,
  // the same way the browser's own `contain` layout does. `lens` then holds
  // the cursor's position relative to that real photo content, which the
  // background-size/position math below uses to zoom into the right spot.
  function handleImageMouseMove(e) {
    if (!naturalSize) {
      setLens(null)
      return
    }

    const rect = mainImageRef.current.getBoundingClientRect()
    const boxRatio = rect.width / rect.height
    const imgRatio = naturalSize.width / naturalSize.height

    let contentWidth, contentHeight, offsetX, offsetY
    if (imgRatio > boxRatio) {
      contentWidth = rect.width
      contentHeight = rect.width / imgRatio
      offsetX = 0
      offsetY = (rect.height - contentHeight) / 2
    } else {
      contentHeight = rect.height
      contentWidth = rect.height * imgRatio
      offsetY = 0
      offsetX = (rect.width - contentWidth) / 2
    }

    const cursorX = e.clientX - rect.left
    const cursorY = e.clientY - rect.top
    const relX = cursorX - offsetX
    const relY = cursorY - offsetY

    // Cursor is over the blank letterboxed margin, not the photo itself.
    if (relX < 0 || relX > contentWidth || relY < 0 || relY > contentHeight) {
      setLens(null)
      return
    }

    setLens({ x: cursorX, y: cursorY, relX, relY, contentWidth, contentHeight })
  }

  function handleImageMouseLeave() {
    setLens(null)
    setGalleryActive(false)
  }

  return (
    <div className={`product-detail-page ${loading ? 'refreshing' : ''}`}>
    <div className="product-detail">
      <div className="product-gallery">
        <div
          className="product-gallery-main-wrap"
          tabIndex={0}
          onMouseMove={handleImageMouseMove}
          onMouseEnter={() => setGalleryActive(true)}
          onMouseLeave={handleImageMouseLeave}
          onFocus={() => setGalleryActive(true)}
          onBlur={() => setGalleryActive(false)}
        >
          {activeSlide?.type === 'video' ? (
            <div
              className="product-gallery-video-frame"
              style={
                (activeSlide.aspectPercent || 56.25) > 100
                  ? { height: '100%', width: `${10000 / (activeSlide.aspectPercent || 56.25)}%` }
                  : { width: '100%', height: `${activeSlide.aspectPercent || 56.25}%` }
              }
            >
              <iframe
                src={activeSlide.url}
                title={product.Model?.Name}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <img
              ref={mainImageRef}
              className={`product-gallery-main ${slides.length > 1 ? 'clickable' : ''}`}
              style={{ opacity: imageLoaded ? 1 : 0 }}
              src={activeSlide?.src}
              alt={product.Name}
              onLoad={handleMainImageLoad}
              onClick={slides.length > 1 ? handleImageClick : undefined}
            />
          )}
          {lens && (
            <div
              className="product-gallery-lens"
              style={{
                left: lens.x - LENS_SIZE / 2,
                top: lens.y - LENS_SIZE / 2,
                backgroundImage: `url(${activeSlide?.src})`,
                backgroundSize: `${lens.contentWidth * LENS_ZOOM}px ${lens.contentHeight * LENS_ZOOM}px`,
                backgroundPosition: `${-(lens.relX * LENS_ZOOM - LENS_SIZE / 2)}px ${-(lens.relY * LENS_ZOOM - LENS_SIZE / 2)}px`,
              }}
            />
          )}
        </div>
        {slides.length > 1 && (
          <div className="product-gallery-thumbs">
            {slides.map((slide, i) => (
              <button
                type="button"
                key={slide.key}
                className={`product-gallery-thumb ${i === activeImage ? 'active' : ''}`}
                onClick={() => setActiveImage(i)}
                aria-label={slide.type === 'video' ? t('video') : undefined}
              >
                <img src={slide.type === 'video' ? images[0]?.Image : slide.src} alt="" />
                {slide.type === 'video' && <span className="product-gallery-thumb-play">▶</span>}
              </button>
            ))}
          </div>
        )}

        <div className="product-stock-badge">
          <span className="product-stock-badge-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <path d="M3.27 6.96 12 12.01l8.73-5.05" />
              <path d="M12 22.08V12" />
            </svg>
          </span>
          <span className="product-stock-badge-text">
            <span className="product-stock-badge-label">{t('stock')}</span>
            <span className="product-stock-badge-value">
              {totalStockQty.toLocaleString(getLang() === 'en' ? 'en-US' : 'sr-RS')}
            </span>
          </span>
        </div>
      </div>

      <div className="product-info">
        <h1>{product.Model?.Name}</h1>
        <p className="product-code">
          {product.ProductIdView} - {(product.Shade?.Name || product.Color?.Name)?.toUpperCase()}
        </p>
        {product.Model?.Description && (
          <p className="product-short-desc">{product.Model.Description}</p>
        )}
        {product.Price === 0 ? (
          <p className="product-price">{t('callForPrice')}</p>
        ) : (
          <>
            <p className="product-price">{formatPriceExclVat(product.Price)}</p>
            <p className="product-price-incl-vat">
              {formatPrice(product.Price)} {t('inclVat')}
            </p>
          </>
        )}
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
                  className={`color-swatch ${v.color === product.Shade?.Id ? 'active' : ''}`}
                  onClick={() => selectColor(v.color)}
                  title={v.colorName}
                >
                  <span
                    className="color-swatch-dot"
                    style={{ backgroundColor: swatchColor(v.color, v.htmlColor) }}
                  />
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
            max={availableQty}
            disabled={!inStock}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <button className="add-to-cart" onClick={handleAddToCart} disabled={!inStock}>
          {t('addToCart')}
        </button>

        <PrintNotice className="print-notice-product" />

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
      <div className="accordion product-description-accordion">
        <button
          type="button"
          className="accordion-toggle"
          onClick={() => setDescriptionOpen((open) => !open)}
        >
          <span className="accordion-icon">{descriptionOpen ? '−' : '+'}</span>
          {t('description')}
        </button>
        {descriptionOpen && <p className="product-description">{product.Model.Description2}</p>}
      </div>
    )}

    <div className="accordion product-documentation-accordion">
      <button
        type="button"
        className="accordion-toggle"
        onClick={() => setDocsOpen((open) => !open)}
      >
        <span className="accordion-icon">{docsOpen ? '−' : '+'}</span>
        {t('documentation')}
      </button>
      {docsOpen && (
        product.ProductCertificates?.length > 0 ? (
          <ul className="product-documentation-list">
            {product.ProductCertificates.map((cert) => (
              <li key={cert.CertificateTypeId}>
                <a
                  className="product-documentation-item"
                  href={cert.DocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="product-documentation-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
                      <path d="M14 3v6h6" />
                    </svg>
                  </span>
                  <span className="product-documentation-name">{cert.CertificateName}</span>
                  <span className="product-documentation-external" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="product-documentation-empty">
            <span className="product-documentation-empty-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6" />
              </svg>
            </span>
            <p>{t('noDocumentation')}</p>
          </div>
        )
      )}
    </div>

    {stockByColor.length > 0 && (
      <div className="product-stock-section">
      <table className="product-stock-table">
        <thead>
          <tr>
            <th>{t('color')}</th>
            <th>{t('stock')}</th>
          </tr>
        </thead>
        <tbody>
          {stockByColor.map((c) => (
            <tr key={c.color}>
              <td>
                <span
                  className="product-stock-dot"
                  style={{ backgroundColor: swatchColor(c.color, c.htmlColor) }}
                />
                <span className="product-stock-name">
                  {c.colorName?.toUpperCase()}
                  <span className="product-stock-code">{c.code}</span>
                </span>
              </td>
              <td className="product-stock-qty">
                {c.stockQty > 0 ? c.stockQty.toLocaleString(getLang() === 'en' ? 'en-US' : 'sr-RS') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    )}

    {similar.length > 0 && (
      <section className="similar-products">
        <h2>{t('similarProducts')}</h2>
        <ProductCarousel items={similar} classPrefix="similar-products-carousel" maxVisible={5} />
      </section>
    )}
    </div>
  )
}

export default ProductDetail
