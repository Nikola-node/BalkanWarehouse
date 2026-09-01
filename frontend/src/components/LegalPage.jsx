import { t } from '../i18n'

function LegalPage({ titleKey }) {
  return (
    <div className="legal-page">
      <h1>{t(titleKey)}</h1>
      <p>{t('comingSoon')}</p>
    </div>
  )
}

export default LegalPage
