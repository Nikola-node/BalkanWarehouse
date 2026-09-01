import { useEffect, useState } from 'react'
import { BACKEND_URL } from '../config'
import { t, getLang } from '../i18n'
import ProductCarousel from './ProductCarousel'

const SLIDE_INTERVAL_MS = 5000
const NEWEST_INTERVAL_MS = 2000

// Rebuilt as a plain crossfade: every slide is absolutely-positioned filling
// the whole box, stacked directly on top of each other, and only its own
// opacity toggles. No width/transform/percentage math of any kind is
// involved, so there's nothing left for a sizing bug to hide in.
function HeroCarousel() {
  const [ads, setAds] = useState([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/ads`)
      .then((res) => res.json())
      .then((data) => setAds(data.items))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % ads.length), SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [ads.length])

  if (ads.length === 0) return null

  function prev() {
    setIndex((i) => (i - 1 + ads.length) % ads.length)
  }

  function next() {
    setIndex((i) => (i + 1) % ads.length)
  }

  return (
    <div className="hero-carousel">
      {ads.length > 1 && (
        <button type="button" className="hero-arrow hero-arrow-left" onClick={prev} aria-label={t('heroPrevSlide')}>
          ‹
        </button>
      )}

      {ads.map((ad, i) => (
        <div className={`hero-slide ${i === index ? 'active' : ''}`} key={ad.id}>
          <img className="hero-slide-image" src={`${BACKEND_URL}${ad.url}`} alt="" />
        </div>
      ))}

      {ads.length > 1 && (
        <button type="button" className="hero-arrow hero-arrow-right" onClick={next} aria-label={t('heroNextSlide')}>
          ›
        </button>
      )}

      {ads.length > 1 && (
        <div className="hero-dots">
          {ads.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              className={`hero-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NewestProducts() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const params = new URLSearchParams({ limit: 16, lang: getLang() })
    fetch(`${BACKEND_URL}/api/products/featured?${params}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items))
  }, [])

  return (
    <section className="newest-products">
      <h2>{t('newestProducts')}</h2>
      <ProductCarousel
        items={items}
        classPrefix="newest-products"
        maxVisible={5}
        isNewBadge
        autoAdvanceMs={NEWEST_INTERVAL_MS}
        showDots
      />
    </section>
  )
}

function Home() {
  return (
    <div className="home-page">
      <HeroCarousel />
      <NewestProducts />
    </div>
  )
}

export default Home
