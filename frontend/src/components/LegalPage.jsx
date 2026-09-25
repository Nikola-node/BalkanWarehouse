import { t, getLang } from '../i18n'
import legalContent from '../legalContent'

function LegalPage({ titleKey }) {
  const sections = legalContent[titleKey]?.[getLang()]

  return (
    <div className="legal-page">
      <h1>{t(titleKey)}</h1>
      {!sections && <p>{t('comingSoon')}</p>}
      {sections?.map((section, i) => (
        <section key={i} className="legal-page-section">
          {section.heading && <h2>{section.heading}</h2>}
          {section.body?.map((paragraph, j) => <p key={j}>{paragraph}</p>)}
          {section.list && (
            <ul>
              {section.list.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

export default LegalPage
