import { Link } from 'react-router-dom'
import { t } from '../i18n'

// Real logo files from Banca Intesa's own brand package (not stand-ins) -
// grouping/spacing follows their own reference layout: acceptance marks
// together, then their logo, then the security program marks together,
// each program mark linked to its own required URL.
const ACCEPTANCE_MARKS = [
  { src: '/payment-logos/maestro.png', alt: 'Maestro' },
  { src: '/payment-logos/mastercard.png', alt: 'Mastercard' },
  { src: '/payment-logos/dinacard.png', alt: 'DinaCard' },
  { src: '/payment-logos/visa.png', alt: 'Visa' },
  { src: '/payment-logos/amex.png', alt: 'American Express' },
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-col">
          <h4>{t('footerQuickLinks')}</h4>
          <nav>
            <Link to="/o-nama">{t('footerAbout')}</Link>
            <Link to="/uslovi-kupovine">{t('footerTerms')}</Link>
            <Link to="/dostava">{t('footerDelivery')}</Link>
            <Link to="/nacin-placanja">{t('footerPayment')}</Link>
            <Link to="/diskriminacija">{t('footerDiscrimination')}</Link>
            <Link to="/politika-privatnosti">{t('footerPrivacy')}</Link>
            <Link to="/povracaj-robe">{t('footerReturns')}</Link>
          </nav>
        </div>

        <div className="site-footer-col">
          <h4>{t('footerContactUs')}</h4>
          <p>Kneza Višeslava 63, TC Vidikovac Lokal/1.43, Beograd</p>
          <p>+38162625111</p>
          <p>{t('workingHours')}</p>
          <p>info@balkanwarehouse.com</p>
        </div>
      </div>

      <p className="site-footer-disclaimer">{t('footerDisclaimer')}</p>

      <div className="site-footer-payments">
        <div className="site-footer-payment-group">
          {ACCEPTANCE_MARKS.map((logo) => (
            <img key={logo.alt} src={logo.src} alt={logo.alt} />
          ))}
        </div>

        <a href="https://www.bancaintesa.rs/" target="_blank" rel="noreferrer" className="site-footer-bank-logo">
          <img src="/payment-logos/banca-intesa.png" alt="Banca Intesa" />
        </a>

        <div className="site-footer-payment-group site-footer-payment-group-secure">
          <a href="https://www.mastercard.com/rs/consumer/credit-cards.html" target="_blank" rel="noreferrer">
            <img src="/payment-logos/mc-id-check.png" alt="Mastercard ID Check" />
          </a>
          <a
            href="https://rs.visa.com/pay-with-visa/security-and-assistance/protected-everywhere.html"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/payment-logos/visa-secure.png" alt="Visa Secure" />
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>MEDONI © {new Date().getFullYear()}. {t('footerRights')}</span>
      </div>
    </footer>
  )
}

export default Footer
