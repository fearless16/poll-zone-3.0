import { useState, useRef } from 'react'
import { addPoll } from '../Firebase/dbHandler'
import { useRoomData } from '../Context/useRoomData'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Alert } from 'react-bootstrap'
import { FAILURE } from '../Context/pollReducer'
import Loader from './Loader'

function Voting() {
  const [numberOfOptions, setNumberOfOptions] = useState(4)
  const formRef = useRef()
  const [clicked, setClicked] = useState(false)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState()
  const { dispatch, pollState } = useRoomData()
  const navigate = useNavigate()

  // const resetForm = () => {
  //   const elements = formRef.current.elements
  //   for (let i = 0, element; (element = elements[i++]); ) {
  //     element.value = ''
  //   }
  // }

  const renderOptions = () => {
    const optionsArray = []
    let renders = 0
    renders = numberOfOptions < 9 ? numberOfOptions : 8
    renders = renders > 1 ? renders : 0
    for (let i = 0; i < renders; i++) {
      const optionsField = (
        <input
          type="text"
          name="options"
          className="input form-control mb-2"
          key={i}
          required
          placeholder={`Option ${i + 1}`}
        />
      )
      optionsArray.push(optionsField)
    }
    return optionsArray
  }

  const handleChange = (e) => {
    setNumberOfOptions(e.target.value < 8 ? e.target.value : 8)
    if (e.target.value > 8) {
      setError('Number of options should be less than 11')
    } else if (e.target.value < 2) {
      setError('Number of options should be greater than 1')
    } else {
      setError('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Disabling the submit button
    setClicked(true)
    const elements = e.target.elements
    const optionValues = []
    if (numberOfOptions < 1) {
      setError('Number of options should be greater than 1')
      return
    }
    for (let i = 0, element; (element = elements[i++]); ) {
      if (element.name === 'options') {
        const option = {
          option: element.value.trim(),
          votes: 0,
        }
        optionValues.push(option)
      }
    }

    setData(optionValues, question)
      .then(() => {
        navigate('/poll')
      })
      .catch(() => {
        navigate('/create')
      })
  }

  async function setData(options, question) {
    try {
      return addPoll(options, question)
    } catch (err) {
      dispatch({ type: FAILURE })
      navigate('/create')
    }
  }

  return (
    <>
      {error && (numberOfOptions < 2 || numberOfOptions > 8) && (
        <Alert variant="danger">{error}</Alert>
      )}
      {pollState.loading && <Loader />}
      {!pollState.loading && (
        <Card className="form-manager shadow p-3 mb-3 bg-white rounded ">
          <Card.Body>
            <Card.Title> Question Poll </Card.Title>
            <form
              ref={formRef}
              onSubmit={(e) => handleSubmit(e)}
              className="voting"
            >
              <input
                type="text"
                className="input form-control mb-2"
                placeholder="Enter question"
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
              <input
                type="number"
                className="input form-control mb-2"
                value={numberOfOptions}
                min={2}
                max={8}
                onChange={(e) => handleChange(e)}
                placeholder="Number of Options"
              />
              {renderOptions().map((field) => field)}
              <div className="buttons-grp ">
                <Button
                  disabled={clicked}
                  type="reset"
                  className="m-2"
                  variant="danger"
                >
                  Reset Form{' '}
                </Button>
                <Button disabled={clicked} type="submit" className="m-2">
                  Submit
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

export default Voting
