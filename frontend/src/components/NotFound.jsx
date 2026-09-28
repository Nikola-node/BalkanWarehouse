import { Link } from 'react-router-dom'
import { t } from '../i18n'

function NotFound() {
  return (
    <div className="not-found">
      <p className="not-found-code">404</p>
      <h1>{t('notFoundTitle')}</h1>
      <p>{t('notFoundBody')}</p>
      <Link to="/" className="cart-continue">
        {t('backToHome')}
      </Link>
    </div>
  )
}

export default NotFound
