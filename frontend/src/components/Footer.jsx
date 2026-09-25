import { Link } from 'react-router-dom'
import { t } from '../i18n'

const PAYMENT_BADGES = ['Maestro', 'Mastercard', 'DinaCard', 'VISA', 'American Express', 'Banca Intesa', 'Mastercard ID Check', 'Visa Secure']

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
          <p>info@balkanwarehouse.com</p>
        </div>
      </div>

      <p className="site-footer-disclaimer">{t('footerDisclaimer')}</p>

      <div className="site-footer-payments">
        {PAYMENT_BADGES.map((label) => (
          <span key={label} className="payment-badge">{label}</span>
        ))}
      </div>

      <div className="site-footer-bottom">
        <span>MEDONI © {new Date().getFullYear()}. {t('footerRights')}</span>
      </div>
    </footer>
  )
}

export default Footer
