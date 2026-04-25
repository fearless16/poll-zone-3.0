import { Icon } from '@iconify/react'

function PageNotFound() {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center fadeIn" style={{ minHeight: '60vh', color: 'var(--muted-text)' }}>
      <Icon icon="fa:frown-o" height={80} width={80} className="mb-3" />
      <h1 className="fw-bold" style={{ fontSize: '3rem', color: 'var(--text-color)' }}>404</h1>
      <p style={{ fontSize: '1.1rem' }}>Page not found</p>
    </div>
  )
}

export default PageNotFound
