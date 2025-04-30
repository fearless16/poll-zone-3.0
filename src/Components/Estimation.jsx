import { useState } from 'react'
import { addPoll } from '../Firebase/dbHandler'
import { useRoomData } from '../Context/useRoomData'
import { Card, Button, Alert } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import Loader from './Loader'
import { FAILURE } from '../Context/pollReducer'

function Estimation() {
  const [numberOfOptions, setNumberOfOptions] = useState(6)
  const { pollState, dispatch } = useRoomData()
  const [clicked, setClicked] = useState(() => false)

  const navigate = useNavigate()

  const getFibValues = (limit) => {
    let fib = []
    fib[0] = 1
    fib[1] = 2

    for (let i = 2; i < limit; i++) {
      fib[i] = fib[i - 1] + fib[i - 2]
    }
    return fib
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const fib = getFibValues(numberOfOptions)
    const options = []

    for (let i = 0; i < numberOfOptions; i++) {
      const option = {
        option: fib[i],
        votes: 0,
      }
      options.push(option)
    }
    setData(options)
      .then(() => {
        navigate('/poll')
      })
      .catch((err) => {
        setClicked(false)
        dispatch({ type: FAILURE })
      })
  }

  const handleChange = (e) => {
    setNumberOfOptions(e.target.value)
  }

  async function setData(options) {
    try {
      const roomId = localStorage.getItem('roomId')
      await addPoll(roomId, options)
    } catch (err) {
      dispatch({ type: FAILURE })
      navigate('/create')
    }
  }

  return (
    <>
      {(pollState.loading || clicked) && <Loader />}
      {!pollState.loading && pollState.error && (
        <Alert variant="danger">{pollState.error}</Alert>
      )}
      {!pollState.loading && !clicked && (
        <Card className="shadow p-3 mb-3 bg-white rounded">
          <Card.Body>
            <Card.Title style={{ marginLeft: '.5rem' }}>
              Create Estimation Poll
            </Card.Title>
            <Card.Text
              className="text-muted"
              style={{ margin: 0, padding: 0, marginLeft: '.5rem' }}
            >
              Enter number between 2-8
            </Card.Text>
            <form onSubmit={(e) => handleSubmit(e)} className="estimation">
              <input
                type="number"
                className="input form-control"
                value={numberOfOptions}
                max={8}
                min={2}
                onChange={(e) => handleChange(e)}
                placeholder="Number of Options"
              />
              <Button
                onSubmit={(e) => handleSubmit(e)}
                style={{ marginLeft: '.3rem' }}
                disabled={clicked}
                type="submit"
                variant="primary"
                className="mt-2 "
              >
              {clicked ? 'Loading...': 'Submit'}
              </Button>
            </form>
          </Card.Body>
        </Card>
      )}
    </>
  )
}

export default Estimation
