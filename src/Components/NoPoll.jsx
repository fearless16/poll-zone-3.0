import React from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const NoPoll = ({ message }) => {
  return (
    <div className="d-flex justify-content-center align-items-center mt-5 px-3 bounceIn">
      <Card
        style={{ maxWidth: '36rem', width: '100%' }}
        className="text-center shadow-sm border-0 py-5 px-4"
      >
        <Card.Body>
          <Card.Title as="h5" className="mb-3 fw-semibold" style={{ color: 'var(--text-color)' }}>
            {message.message}
          </Card.Title>
          {message.path && (
            <Link to={message.path} className="btn btn-primary btn-sm mt-2">
              {message.linkMessage}
            </Link>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default NoPoll
