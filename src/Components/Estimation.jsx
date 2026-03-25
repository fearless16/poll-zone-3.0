import { useState } from 'react'
import { addPoll } from '../Firebase/dbHandler'
import { useRoomData } from '../Context/useRoomData'
import { Card, Button, Alert, Form, Row, Col } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { REDUCER_ACTIONS } from '../Utils/constants'

function Estimation() {
  const [numberOfOptions, setNumberOfOptions] = useState(6)
  const [clicked, setClicked] = useState(false)
  const { pollState, dispatch } = useRoomData()
  const navigate = useNavigate()

  const getFibValues = (limit) => {
    const fib = [1, 2]
    for (let i = 2; i < limit; i++) {
      fib[i] = fib[i - 1] + fib[i - 2]
    }
    return fib
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setClicked(true)
    
    const roomId = localStorage.getItem('roomId')
    if (!roomId) {
      dispatch({ type: REDUCER_ACTIONS.FAILURE })
      setClicked(false)
      return
    }
    
    const fib = getFibValues(numberOfOptions)

    const options = fib.slice(0, numberOfOptions).map((value) => ({
      option: value,
      votes: 0,
    }))

    try {
      await addPoll(roomId, options)
      navigate('/poll')
    } catch (err) {
      dispatch({ type: REDUCER_ACTIONS.FAILURE })
      setClicked(false)
    }
  }

  return (
    <>
      {!pollState.loading && pollState.error && (
        <Alert variant="danger" className="mt-3">
          {pollState.error}
        </Alert>
      )}

      {!pollState.loading && (
        <Card className="">
          <Card.Body>
            <Card.Title className="fw-semibold mb-2">Create Estimation Poll</Card.Title>
            <Card.Text className="text-muted mb-3">
              Enter a number between 2–8 to generate Fibonacci options
            </Card.Text>
            <Form onSubmit={handleSubmit}>
              <Row className="align-items-end">
                <Col xs={8}>
                  <Form.Group controlId="numOptions">
                    <Form.Control
                      type="number"
                      value={numberOfOptions}
                      onChange={(e) => setNumberOfOptions(parseInt(e.target.value) || 2)}
                      min={2}
                      max={8}
                      placeholder="Number of options"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col xs="auto">
                  <Button type="submit" variant="dark" disabled={clicked}>
                    {clicked ? 'Loading...' : 'Submit'}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

export default Estimation
