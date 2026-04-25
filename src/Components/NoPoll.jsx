import React from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const NoPoll = ({ message }) => {
  const classes = [
    'mt-4',
    'mb-5',
    'shadow',
    'rounded-3',
    'd-flex',
    'justify-content-center',
    'align-items-center',
    'voting-form',
    'bounceIn',
  ].join(' ')

  return (
    <div className={classes}>
      <Card
        style={{ width: '40rem', height: '20rem' }}
        className="d-flex justify-content-center align-items-center"
      >
        <Card.Title className="text-center">
          {message.message}
          {message.path && (
            <Link to={message.path} className="mx-2">
              {message.linkMessage}
            </Link>
          )}
        </Card.Title>
      </Card>
    </div>
  )
}

export default NoPoll
