import React from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router'

const NoPoll = ({ message }) => {
  return (
    <div className="d-flex justify-content-center align-items-center mt-5 px-3 bounceIn">
      <Card
        style={{ maxWidth: '36rem', width: '100%' }}
        className="text-center shadow-sm py-5 px-4"
      >
        <Card.Body>
          <Card.Title as="h5" className="mb-3 fw-semibold">
            {message.message}
          </Card.Title>
          {message.path && (
            <Link to={message.path} className="btn btn-dark btn-sm mt-2">
              {message.linkMessage}
            </Link>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default NoPoll
