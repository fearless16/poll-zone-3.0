import { useState, useEffect } from 'react'
import { castVote } from '../../Firebase/dbHandler'
import { Button, Row, Col, Form, Spinner } from 'react-bootstrap'
import Loader from '../Loader'

/**
 * VotingForm component - handles voting flow inside a poll.
 *
 * @param {Object} props
 * @param {Object} props.pollState - Poll state context
 * @param {Function} props.dispatch - Dispatcher for poll state actions
 * @returns {JSX.Element}
 */
function VotingForm({ pollState, dispatch }) {
  const [question, setQuestion] = useState('')
  const [, setType] = useState('')
  const [selected, setSelected] = useState('')
  const [clicked, setClicked] = useState(false)
  const [options, setOptions] = useState([])
  const [error, setError] = useState('')

  /**
   * Handles vote submission.
   *
   * @param {Event} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (clicked) return
    setClicked(true)

    try {
      const id = localStorage.getItem('id')
      const displayName = localStorage.getItem('displayName')
      const roomId = localStorage.getItem('roomId')
      
      if (!id || !displayName || !roomId) {
        setError('Missing user information')
        setClicked(false)
        return
      }
      
      if (!pollState?.currentPollData || !Array.isArray(options) || options.length === 0) {
        setError('Invalid poll state')
        setClicked(false)
        return
      }
      
      const index = options.findIndex((opt) => opt.option.toString() === selected)

      if (index === -1 || pollState.currentPollData.voted?.some((v) => v.id === id)) {
        setClicked(false)
        return
      }

      await castVote(roomId, index, id, displayName)
    } catch (err) {
      setError(err?.message || 'Failed to submit vote')
    } finally {
      setClicked(false)
    }
  }

  /**
   * Handles change in selected option.
   *
   * @param {Event} e
   */
  const handleChange = (e) => {
    setSelected(e.target.value)
  }

  /*
    ----------------------------------------------------------------------
    🧲 Poll Data Listener
    Extracts poll info on change and updates local state
    ----------------------------------------------------------------------
  */
  useEffect(() => {
    if (!pollState.currentPollData) return

    const data = pollState.currentPollData
    setQuestion(data.question || '')
    setType(data.question ? 'voting' : 'estimation')
    setOptions(data.options || [])
  }, [pollState.currentPollData])

  /*
    ----------------------------------------------------------------------
    🧱 Render Form UI
    Responsive layout with Bootstrap grid and utilities
    ----------------------------------------------------------------------
  */
  return (
    <>
      {clicked && <Loader />}

      {!clicked && pollState.currentPollData && (
        <Form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded-3 bounceIn mt-4">
          {error && (
            <div className="alert alert-danger text-center" role="alert">
              {error}
            </div>
          )}
          <h5 className="text-center mb-4 fw-bold">{question || 'Estimation Poll'}</h5>
          <Row>
            <Col xs={12} className="d-flex flex-column gap-3">
              {options.map((option, idx) => (
                <Form.Check
                  type="radio"
                  id={`option-${idx}`}
                  key={idx}
                  label={<span style={{ fontSize: '1.2rem' }}>{option.option}</span>}
                  name="poll-options"
                  value={String(option.option)}
                  onChange={handleChange}
                />
              ))}
            </Col>
          </Row>
          <Row className="mt-4">
            <Col xs={12}>
              <Button
                type="submit"
                variant="dark"
                disabled={clicked || !selected}
                className="w-100 py-3 fs-5 rounded d-flex align-items-center justify-content-center"
              >
                {clicked ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      )}
    </>
  )
}

export default VotingForm
