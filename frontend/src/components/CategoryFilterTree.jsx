import { useEffect, useState } from 'react'
import { BACKEND_URL } from '../config'
import { t, getLang } from '../i18n'

function CategoryNode({ node, nodeId, depth, onSelect, openIds, onToggle }) {
  const isActive = node.id === nodeId
  const open = openIds.has(node.id)
  const hasChildren = node.children?.length > 0

  return (
    <li className="category-filter-node">
      <div className={`category-filter-row depth-${depth} ${isActive ? 'active' : ''}`}>
        <button type="button" className="category-filter-label" onClick={() => onSelect(node.id)}>
          {node.name} <span className="category-filter-count">({node.count})</span>
        </button>
        {hasChildren && (
          <button
            type="button"
            className="category-filter-toggle"
            onClick={() => onToggle(node.id)}
            aria-label={open ? t('collapse') : t('expand')}
          >
            <span className={`filter-sidebar-caret ${open ? 'open' : ''}`}>⌄</span>
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="category-filter-children">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              nodeId={nodeId}
              depth={depth + 1}
              onSelect={onSelect}
              openIds={openIds}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function CategoryFilterTree({ nodeId, onSelect }) {
  const [tree, setTree] = useState([])
  const [sectionOpen, setSectionOpen] = useState(true)
  const [openIds, setOpenIds] = useState(new Set())

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/categories?lang=${getLang()}`)
      .then((res) => res.json())
      .then(setTree)
  }, [])

  // Whichever category is selected (from here or the top mega-menu) is the
  // only branch that should be expanded - picking a new one collapses
  // whatever was previously open instead of accumulating open branches.
  useEffect(() => {
    const next = new Set()
    const parts = nodeId ? nodeId.split('/') : []
    let path = ''
    for (const part of parts) {
      path = path ? `${path}/${part}` : part
      next.add(path)
    }
    setOpenIds(next)
  }, [nodeId])

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (tree.length === 0) return null

  return (
    <div className="filter-sidebar-section">
      <button type="button" className="filter-sidebar-toggle" onClick={() => setSectionOpen(!sectionOpen)}>
        {t('category')}
        <span className={`filter-sidebar-caret ${sectionOpen ? 'open' : ''}`}>⌄</span>
      </button>
      {sectionOpen && (
        <ul className="category-filter-tree">
          {tree.map((node) => (
            <CategoryNode key={node.id} node={node} nodeId={nodeId} depth={0} onSelect={onSelect} openIds={openIds} onToggle={toggle} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default CategoryFilterTree
