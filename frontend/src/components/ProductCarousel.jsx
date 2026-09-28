import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import ProductCard from './ProductCard'

const CARD_GAP = 20

// Fewer cards fit as the viewport narrows - on a phone, a fixed number of
// fixed-width cards would either overflow the screen or get squeezed
// unreadably thin. `width` is the track viewport alone, not the row - the
// two arrow buttons beside it (~48px each, incl. gap) already ate into it,
// so these thresholds sit ~100px below where they'd be if arrows still
// overlaid the cards instead of sitting next to them.
function visibleCardsFor(width, maxVisible) {
  if (width === 0) return maxVisible // not measured yet - assume desktop, corrected once real width comes in
  if (width < 600) return 2
  if (width < 880) return 3
  if (width < 1160) return Math.min(4, maxVisible)
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
  // Clicking (or an auto-advance tick) faster than the 0.4s slide can finish
  // used to just queue up another setSlot on top of the one still animating
  // - rapid clicking could stack up dozens of pending slides, each still
  // rendering its own cards, which is what made the row freeze and show
  // blank cards until the backlog cleared. A plain ref (not state) is fine
  // since it only gates a callback and never needs to trigger a render.
  const busyRef = useRef(false)

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

  // A backgrounded tab still fires setInterval (just throttled), so a slot
  // left running would silently rack up many advances while the page isn't
  // painting anything - then, the moment it's foregrounded again, the very
  // next paint jumps straight to that far-off slot, sliding through several
  // cards at once instead of the usual single step. Pausing while hidden
  // means there's nothing to catch up on when you come back.
  useEffect(() => {
    if (!autoAdvanceMs || items.length <= visible) return
    let timer = null
    function start() {
      timer = setInterval(() => {
        if (busyRef.current) return
        busyRef.current = true
        setSlot((s) => s + 1)
      }, autoAdvanceMs)
    }
    function stop() {
      clearInterval(timer)
      timer = null
    }
    function handleVisibility() {
      if (document.hidden) stop()
      else if (!timer) start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
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
    if (busyRef.current) return
    busyRef.current = true
    setSlot((s) => s - 1)
  }

  function next() {
    if (busyRef.current) return
    busyRef.current = true
    setSlot((s) => s + 1)
  }

  function goTo(i) {
    if (busyRef.current) return
    busyRef.current = true
    setSlot(visible + i)
  }

  // Once a wrap-slide finishes, silently snap back into the real range so
  // there's always room to keep sliding in that direction. This also always
  // fires at the end of every real slide, wrap or not, so it's the one spot
  // that clears `busyRef` and lets the next click or auto-advance through.
  function handleTransitionEnd() {
    busyRef.current = false
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
      <div className={`${classPrefix}-row`}>
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

        <div className={`${classPrefix}-viewport`} ref={viewportRef}>
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
                <ProductCard product={product} isNew={isNewBadge} eager />
              </div>
            ))}
          </div>
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
