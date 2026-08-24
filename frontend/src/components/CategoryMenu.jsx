import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BACKEND_URL } from '../config'
import { t } from '../i18n'

function CategoryLevel({ nodes, onSelect, nested }) {
  const [activeId, setActiveId] = useState(null)

  return (
    <div className={nested ? 'category-menu-submenu' : 'category-menu-mains'}>
      {nodes.map((node) => (
        <div
          key={node.id}
          className={`category-menu-item ${node.id === activeId ? 'active' : ''}`}
          onMouseEnter={() => setActiveId(node.id)}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(node.id)
          }}
        >
          <span>
            {node.name} <span className="category-menu-count">({node.count})</span>
          </span>
          {node.children?.length > 0 && <span className="category-menu-arrow">›</span>}

          {node.id === activeId && node.children?.length > 0 && (
            <CategoryLevel nodes={node.children} onSelect={onSelect} nested />
          )}
        </div>
      ))}
    </div>
  )
}

function CategoryMenu() {
  const [categories, setCategories] = useState([])
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/categories`)
      .then((res) => res.json())
      .then(setCategories)
  }, [])

  function goToNode(nodeId) {
    navigate(`/?nodeId=${encodeURIComponent(nodeId)}`)
    setOpen(false)
  }

  return (
    <div
      className="category-menu"
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button type="button" className="category-menu-trigger">
        {t('categories')}
        <span className={`category-menu-chevron ${open ? 'open' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="category-menu-panel">
          <CategoryLevel nodes={categories} onSelect={goToNode} />
        </div>
      )}
    </div>
  )
}

export default CategoryMenu
