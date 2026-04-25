import { useState, useEffect } from 'react'
import { castVote } from '../../Firebase/dbHandler'
import { Button, Row, Col, Form, Spinner } from 'react-bootstrap'
import Loader from '../Loader'
import { REDUCER_ACTIONS } from '../../Utils/constants'

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
  const [selected, setSelected] = useState('')
  const [clicked, setClicked] = useState(false)
  const [options, setOptions] = useState([])

  /**
   * Handles vote submission.
   *
   * @param {Event} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setClicked(true)
    dispatch({ type: REDUCER_ACTIONS.LOADING })

    const id = localStorage.getItem('id')
    const displayName = localStorage.getItem('displayName')
    const roomId = localStorage.getItem('roomId')
    const index = options.findIndex((opt) => opt.option.toString() === selected)

    if (
      index === -1 ||
      !pollState?.currentPollData ||
      pollState.currentPollData.voted.some((v) => v.id === id)
    ) {
      setClicked(false)
      dispatch({ type: REDUCER_ACTIONS.UNSET_LOADING })
      return
    }

    const { error } = await castVote(roomId, index, id, displayName)
    if (error) {
      dispatch({ type: REDUCER_ACTIONS.FAILURE })
    } else {
      dispatch({ type: REDUCER_ACTIONS.VOTED })
    }
    setClicked(false)
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
      {(clicked || pollState.loading) && <Loader />}

      {!clicked && pollState.currentPollData && (
        <Form onSubmit={handleSubmit} className="p-3 bg-white shadow rounded-3 bounceIn mt-4">
          <h5 className="text-center mb-3 fw-bold">{question || 'Estimation Poll'}</h5>
          <Row>
            <Col xs={12} className="d-flex flex-column gap-2">
              {options.map((option, idx) => (
                <Form.Check
                  type="radio"
                  id={`option-${idx}`}
                  key={idx}
                  label={<span>{option.option}</span>}
                  name="poll-options"
                  value={String(option.option)}
                  onChange={handleChange}
                  className="py-1 px-3 rounded"
                />
              ))}
            </Col>
          </Row>
          <Row className="mt-3">
            <Col xs={12}>
              <Button
                type="submit"
                variant="dark"
                disabled={clicked || !selected}
                className="w-100 py-2 rounded d-flex align-items-center justify-content-center"
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
