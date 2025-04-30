import { useState, useEffect } from 'react'
import { castVote } from '../../Firebase/dbHandler'
import { Button } from 'react-bootstrap'
import Loader from '../Loader'
import { VOTED, LOADING, UNSET_LOADING, FAILURE } from '../../Context/pollReducer'

/**
 * VotingForm component - handles voting flow inside a poll.
 *
 * @param {Object} props
 * @param {Object} props.pollState - Poll state context
 * @param {Function} props.dispatch - Dispatcher for poll state actions
 * @returns {JSX.Element}
 */
function VotingForm({ pollState, dispatch }) {
  const [type, setType] = useState()
  const [question, setQuestion] = useState('')
  const [optionField, setOptionField] = useState([])
  const [clicked, setClicked] = useState(false)
  const [selected, setSelected] = useState(false)

  /**
   * Handles vote submission.
   *
   * @param {Event} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setClicked(true)
    dispatch({ type: LOADING })

    if (!pollState.currentPollData) {
      setClicked(false)
      dispatch({ type: UNSET_LOADING })
      return
    }

    const id = localStorage.getItem('id')
    const displayName = localStorage.getItem('displayName')

    if (pollState.currentPollData.voted.find((voter) => voter.id === id)) {
      setClicked(false)
      dispatch({ type: UNSET_LOADING })
      return
    }

    try {
      const roomId = localStorage.getItem('roomId')
      const options = pollState.currentPollData.options
      const index = options.findIndex((data) => data.option.toString() === selected)

      if (index === -1) {
        throw new Error('Invalid voting option selected!')
      }

      await castVote(roomId, index, id, displayName)
    } catch (err) {
      console.error('Vote Error:', err.message, err)
      dispatch({ type: FAILURE })
    } finally {
      setClicked(false)
      dispatch({ type: UNSET_LOADING })
    }
  }

  /**
   * Handles change in selected option.
   *
   * @param {Event} e
   */
  const handleChange = (e) => {
    const selectedValue = e.target.value
    if (selectedValue) {
      setSelected(selectedValue)
    }
  }

  /**
   * Renders the voting options based on poll data.
   */
  const renderOptions = () => {
    const optionsFields = []
    const options = [...pollState.currentPollData.options]

    if (!pollState.currentPollData.question) {
      setType('estimation')
    } else {
      setQuestion(pollState.currentPollData.question)
      setType('voting')
    }

    options.forEach((option) => {
      const val = option.option
      const optionField = (
        <div className="form-check p-1 letter-spacing" key={val}>
          <input
            type="radio"
            onChange={handleChange}
            id={val}
            className="form-check-input cursor-pointer"
            name="options"
            value={val}
          />
          <label
            className="cursor-pointer"
            style={{
              marginLeft: '1rem',
              fontSize: '1.2rem',
              wordSpacing: '0.3rem',
            }}
            htmlFor={val}
          >
            {val}
          </label>
        </div>
      )

      optionsFields.push(optionField)
    })

    setOptionField(optionsFields)
  }

  /**
   * Effect hook to render options initially.
   */
  useEffect(() => {
    renderOptions()
    return () => {
      setClicked(false)
    }
  }, [pollState.currentPollData])

  return (
    <>
      {(clicked || pollState.loading) && <Loader />}

      {!clicked && pollState.currentPollData && (
        <div className="w-100">
          <form onSubmit={(e) => handleSubmit(e)}>
            {!pollState.loading && (
              <div className="text-bold letter-spacing">
                {question ? question : 'Estimation Poll'}
              </div>
            )}
            {optionField && optionField.map((option) => option)}
            <Button
              type="submit"
              disabled={clicked || !selected}
              variant="primary"
              className="mt-2 mb-2 w-100 d-flex justify-content-center align-items-center"
            >
              {clicked ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  )
}

export default VotingForm
