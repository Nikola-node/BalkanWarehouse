import { t } from '../i18n'

function PrintNotice({ className = '' }) {
  return (
    <div className={`print-notice ${className}`}>
      <strong>{t('printNoticeTitle')}</strong>
      <p>{t('printNoticeBody')}</p>
    </div>
  )
}

export default PrintNotice
