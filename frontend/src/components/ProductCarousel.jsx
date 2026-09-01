import { useEffect, useState } from 'react'
import { t } from '../i18n'
import ProductCard from './ProductCard'

const CARD_GAP = 20

// Fewer cards fit as the viewport narrows - on a phone, a fixed number of
// fixed-width cards would either overflow the screen or get squeezed
// unreadably thin.
function visibleCardsFor(width, maxVisible) {
  if (width === 0) return maxVisible // not measured yet - assume desktop, corrected once real width comes in
  if (width < 480) return 1
  if (width < 700) return 2
  if (width < 980) return 3
  if (width < 1260) return Math.min(4, maxVisible)
  return maxVisible
}

// A single row of ProductCards that slides with prev/next arrows and loops
// infinitely - shared by the homepage's "Novi proizvodi" row and the
// product page's "Slični proizvodi" row so this carousel's tricky bits
// aren't duplicated between them. `classPrefix` names the CSS classes
// (`${classPrefix}-viewport`, `-track`, `-card`, `-arrow-left/right`,
// `-dots`, `-dot`) so each caller can style its own row differently.
//
// Sliding uses pixel widths measured via ResizeObserver rather than CSS
// percentages, because the track is padded with clones of the tail/head on
// both ends to make the wrap-around loop seamless - that makes the track
// wider than the visible viewport, so a percentage on a card would resolve
// against the track's width, not the viewport's.
function ProductCarousel({ items, classPrefix, maxVisible = 5, isNewBadge = false, autoAdvanceMs, showDots = false }) {
  // `slot` indexes into the extended (clone-padded) track below - the real
  // product it points to is `slot - visible`, wrapped into range.
  const [slot, setSlot] = useState(maxVisible)
  const [animate, setAnimate] = useState(true)
  const [viewportWidth, setViewportWidth] = useState(0)
  const visible = visibleCardsFor(viewportWidth, maxVisible)
  // A callback ref (not useRef) so this fires the instant the viewport div
  // actually mounts - it may not exist yet on first render (see the early
  // `return null` below), so a useRef+useEffect-on-mount pairing would run
  // before the node exists and never observe anything.
  const [viewportNode, viewportRef] = useState(null)

  useEffect(() => {
    if (!viewportNode) return
    const observer = new ResizeObserver((entries) => setViewportWidth(entries[0].contentRect.width))
    observer.observe(viewportNode)
    return () => observer.disconnect()
  }, [viewportNode])

  // Re-enables the transition on the next frame after a silent (unanimated)
  // jump back into the real range, so the following slide still animates.
  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() => setAnimate(true))
      return () => cancelAnimationFrame(id)
    }
  }, [animate])

  // Whenever the number of visible cards changes (the viewport was just
  // measured, or the window was resized across a breakpoint), the clone
  // padding is a different size, so any previous `slot` value points at the
  // wrong spot in the new track - silently reset to the front instead.
  useEffect(() => {
    setAnimate(false)
    setSlot(visible)
  }, [visible])

  useEffect(() => {
    if (!autoAdvanceMs || items.length <= visible) return
    const timer = setInterval(() => setSlot((s) => s + 1), autoAdvanceMs)
    return () => clearInterval(timer)
  }, [items.length, visible, autoAdvanceMs])

  if (items.length === 0) return null

  const canLoop = items.length > visible
  // A few clones of the tail/head on either side let the slide animate
  // straight through the "wrap" instead of jumping back to the start.
  const track = canLoop
    ? [...items.slice(-visible), ...items, ...items.slice(0, visible)]
    : items
  const cardWidth = viewportWidth > 0 ? (viewportWidth - (visible - 1) * CARD_GAP) / visible : 0
  const stepPx = cardWidth + CARD_GAP

  function prev() {
    setSlot((s) => s - 1)
  }

  function next() {
    setSlot((s) => s + 1)
  }

  function goTo(i) {
    setSlot(visible + i)
  }

  // Once a wrap-slide finishes, silently snap back into the real range so
  // there's always room to keep sliding in that direction.
  function handleTransitionEnd() {
    if (!canLoop) return
    if (slot >= visible + items.length) {
      setAnimate(false)
      setSlot(slot - items.length)
    } else if (slot < visible) {
      setAnimate(false)
      setSlot(slot + items.length)
    }
  }

  const activeDot = canLoop ? ((slot - visible) % items.length + items.length) % items.length : 0

  return (
    <>
      <div className={`${classPrefix}-viewport`} ref={viewportRef}>
        {canLoop && (
          <button
            type="button"
            className={`${classPrefix}-arrow ${classPrefix}-arrow-left`}
            onClick={prev}
            aria-label={t('scrollLeft')}
          >
            ‹
          </button>
        )}

        <div
          className={`${classPrefix}-track`}
          style={{
            transform: `translateX(-${(canLoop ? slot : 0) * stepPx}px)`,
            transition: animate ? 'transform 0.4s ease' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {track.map((product, i) => (
            <div className={`${classPrefix}-card`} style={{ flexBasis: cardWidth || undefined }} key={`${product.model}-${i}`}>
              <ProductCard product={product} isNew={isNewBadge} />
            </div>
          ))}
        </div>

        {canLoop && (
          <button
            type="button"
            className={`${classPrefix}-arrow ${classPrefix}-arrow-right`}
            onClick={next}
            aria-label={t('scrollRight')}
          >
            ›
          </button>
        )}
      </div>

      {showDots && canLoop && (
        <div className={`${classPrefix}-dots`}>
          {items.map((product, i) => (
            <button
              key={product.model}
              type="button"
              className={`${classPrefix}-dot ${i === activeDot ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default ProductCarousel
