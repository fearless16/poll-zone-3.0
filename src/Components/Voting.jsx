import { useState, useRef } from 'react'
import { addPoll } from '../Firebase/dbHandler'
import { useRoomData } from '../Context/useRoomData'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Alert, Form, Row, Col } from 'react-bootstrap'
import { REDUCER_ACTIONS } from '../Utils/constants'

function Voting() {
  const [numberOfOptions, setNumberOfOptions] = useState(4)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [clicked, setClicked] = useState(false)

  const formRef = useRef()
  const { dispatch, pollState } = useRoomData()
  const navigate = useNavigate()

  const renderOptions = () => {
    const renders = Math.max(2, Math.min(numberOfOptions, 8))
    return Array.from({ length: renders }, (_, i) => (
      <Form.Control
        type="text"
        name="options"
        key={i}
        required
        placeholder={`Option ${i + 1}`}
        className="mb-2"
      />
    ))
  }

  const handleChange = (e) => {
    const value = parseInt(e.target.value)
    setNumberOfOptions(value)
    if (value > 8) {
      setError('Maximum 8 options allowed')
      setClicked(true)
    } else if (value < 2) {
      setError('Minimum 2 options required')
      setClicked(true)
    } else {
      setError('')
      setClicked(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setClicked(true)
    const formElements = e.target.elements
    const options = []
    const seenOptions = new Set()

    for (let i = 0; i < formElements.length; i++) {
      const el = formElements[i]
      if (el.name === 'options' && el.value.trim()) {
        const optionValue = el.value.trim().toLowerCase()
        if (seenOptions.has(optionValue)) {
          setError('Duplicate options are not allowed')
          setClicked(false)
          return
        }
        seenOptions.add(optionValue)
        options.push({ option: el.value.trim(), votes: 0 })
      }
    }

    if (options.length < 2) {
      setError('At least 2 valid options required')
      setClicked(false)
      return
    }

    try {
      const roomId = localStorage.getItem('roomId')
      if (!roomId) {
        setError('Room ID not found')
        setClicked(false)
        return
      }
      
      const { error: pollError } = await addPoll(roomId, options, question)
      if (pollError) {
        setError(pollError.message || 'Failed to create poll')
        setClicked(false)
        return
      }
      navigate('/poll')
    } catch {
      dispatch({ type: REDUCER_ACTIONS.FAILURE })
      setClicked(false)
      navigate('/create')
    }
  }

  return (
    <>
      {!pollState.loading && (
        <Card className="border-2">
          {' '}
          <Card.Body>
            <Card.Title className="fw-semibold mb-3">Create Question Poll</Card.Title>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form ref={formRef} onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="Enter your question"
                  value={question}
                  className="p-3"
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Control
                  type="number"
                  placeholder="Number of options (2–8)"
                  value={numberOfOptions}
                  min={2}
                  max={8}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <div className="mb-3">{renderOptions()}</div>

              <Row className="justify-content-center mt-3">
                <Col xs="auto">
                  <Button variant="secondary" type="reset" size="md" disabled={clicked}>
                    Reset
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button variant="dark" type="submit" size="md" disabled={clicked}>
                    {clicked ? 'Submitting...' : 'Submit'}
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

export default Voting
