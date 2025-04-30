import React from 'react'
import { Card } from 'react-bootstrap'

const NoPoll = ({ message }) => {
  return (
    <div className="d-flex justify-content-center align-items-center voting-form">
      <Card
        style={{ width: '40rem', height: '20rem' }}
        className="d-flex justify-content-center align-items-center"
      >
        <Card.Title className="text-center">
          {message.message}
          <Card.Link href={message.path} className="mx-2">{message.linkMessage}</Card.Link>
        </Card.Title>
      </Card>
    </div>
  )
}

export default NoPoll
