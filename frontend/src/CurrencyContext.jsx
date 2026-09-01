import { createContext, useContext, useEffect, useState } from 'react'
import { BACKEND_URL } from './config'

const CurrencyContext = createContext(null)

// Falls back to this if /api/settings hasn't answered yet (or is
// unreachable) - close enough to the real rate that prices don't look wildly
// wrong for the brief moment before the real rate loads.
const FALLBACK_RATE = 117.5

export function CurrencyProvider({ children }) {
  const [rate, setRate] = useState(FALLBACK_RATE)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.eurToRsdRate) setRate(data.eurToRsdRate)
      })
      .catch(() => {})
  }, [])

  // The site's prices are all stored in EUR (straight from Promobox, with
  // markup applied) - this is the one place that turns a EUR amount into
  // the RSD text shown to a customer, so every price on the site converts
  // consistently and updates together when an admin changes the rate.
  // Rounds to the whole dinar, since RSD has no smaller unit in practice.
  function toRsd(eurAmount) {
    return Math.round(eurAmount * rate)
  }

  function formatRsd(rsdAmount) {
    return `${rsdAmount.toLocaleString('sr-RS')} din`
  }

  function formatPrice(eurAmount) {
    return formatRsd(toRsd(eurAmount))
  }

  // A line total has to be the displayed unit price times the quantity, or
  // it won't add up for the customer (e.g. "310 din" shown per unit but a
  // total that isn't a clean multiple of 310) - so this rounds the unit
  // price to RSD *first*, then multiplies, rather than converting
  // quantity*EUR to RSD and rounding only once at the end.
  function formatLineTotal(eurUnitPrice, quantity) {
    return formatRsd(toRsd(eurUnitPrice) * quantity)
  }

  // For the price-range filter, which takes RSD input from the customer but
  // has to send EUR to the backend (Promobox prices are compared in EUR).
  function eurFromRsd(rsdAmount) {
    return rsdAmount / rate
  }

  function rsdFromEur(eurAmount) {
    return eurAmount * rate
  }

  return (
    <CurrencyContext.Provider
      value={{ rate, formatPrice, formatLineTotal, toRsd, formatRsd, eurFromRsd, rsdFromEur }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
