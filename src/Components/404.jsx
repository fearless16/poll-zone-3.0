import { Icon } from '@iconify/react'

function PageNotFound() {
  return (
    <div className="d-flex justify-content-center align-items-center">
      <Icon icon="fa:frown-o" height={300} width={40} className="mx-2 align-self-center" />{' '}
      <h1 className="mt-2 mx-2">404 | Page not found</h1>
    </div>
  )
}

export default PageNotFound
