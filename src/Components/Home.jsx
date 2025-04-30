import { useState, useRef } from 'react'
import { createRoom, joinPoll } from '../Firebase/dbHandler'
import { Alert, Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import Toast from './Toast'
import Header from './Header'
import Footer from './Footer'

/**
 * Home Component - Responsible for Create and Join Poll actions.
 * @returns {JSX.Element} Home page layout
 */
function Home() {
  const [err, setError] = useState()
  const idRef = useRef()
  const roomNameRef = useRef()
  const createNameRef = useRef()
  const joinNameRef = useRef()
  const [disabled, setDisabled] = useState(false)
  const [show, setShow] = useState(false)
  const [roomId, setRoomId] = useState('')
  const navigate = useNavigate()

  /**
   * Handle create poll form submit
   * @param {Event} e
   */
  const handleCreateSubmit = (e) => {
    e.preventDefault()
    setDisabled(true)
    setError(undefined)

    createRoom(createNameRef.current.value, roomNameRef.current.value)
      .then((res) => {
        if (res.error) {
          setError(res.error)
          setDisabled(false)
          return
        }
        createNameRef.current.value = ''
        roomNameRef.current.value = ''
        localStorage.setItem('roomId', res.response.roomId)
        setRoomId(res.response.roomId)
        setShow(true)
        setDisabled(false)
      })
      .catch((err) => {
        console.error('Create Poll Error:', err)
        setError('Something went wrong')
        setDisabled(false)
      })
  }

  /**
   * Handle join poll form submit
   * @param {Event} e
   */
  const handleJoinSubmit = (e) => {
    e.preventDefault()
    setDisabled(true)
    setError(undefined)

    const roomId = idRef.current.value.trim()
    const name = joinNameRef.current.value.trim()

    if (!roomId || !name) {
      setError('Display name and Room ID are required.')
      setDisabled(false)
      return
    }

    localStorage.setItem('roomId', roomId)

    joinPoll(roomId, name)
      .then(() => {
        idRef.current.value = ''
        joinNameRef.current.value = ''
        navigate('/poll')
      })
      .catch((error) => {
        console.error('Join Poll Error:', error)
        setError('Something went wrong')
        setDisabled(false)
      })
  }

  return (
    <>
      <Header />
      <div className="home-div">
        <div className="form-div">
          {err && <Alert variant="danger">{err}</Alert>}

          {/* Create Poll Section */}
          <Card
            style={{ width: '30rem', padding: '0.5rem' }}
            className="shadow p-3 mb-5 bg-white rounded m-2 p-2"
          >
            <Card.Body>
              <Card.Title style={{ marginLeft: '0.5rem' }}>Create Poll Room</Card.Title>
              <form onSubmit={handleCreateSubmit} id="create-form">
                <input
                  ref={createNameRef}
                  type="text"
                  id="create"
                  className="input form-control mb-2"
                  placeholder="Enter display name"
                  required
                />
                <input
                  ref={roomNameRef}
                  type="text"
                  className="input form-control mb-2"
                  placeholder="Enter room name"
                  required
                />
                <Button type="submit" variant="primary" className="m-2" disabled={disabled}>
                  Create Poll
                </Button>
              </form>
            </Card.Body>
          </Card>

          {/* Join Poll Section */}
          <Card
            style={{ width: '30rem', padding: '0.5rem' }}
            className="shadow p-3 mb-5 bg-white rounded m-2 p-2"
          >
            <Card.Body>
              <Card.Title style={{ marginLeft: '0.5rem' }}>Join Poll Room</Card.Title>
              <form onSubmit={handleJoinSubmit}>
                <input
                  ref={joinNameRef}
                  type="text"
                  name="display-name-create"
                  className="input form-control mb-2"
                  placeholder="Enter display name"
                  required
                />
                <input
                  ref={idRef}
                  type="text"
                  name="join-room-id"
                  className="input form-control mb-2"
                  placeholder="Enter room id"
                  required
                />
                <Button type="submit" variant="secondary" className="m-2" disabled={disabled}>
                  Join Poll
                </Button>
              </form>
            </Card.Body>
          </Card>
        </div>

        {/* Toast after room creation */}
        {show && <Toast show={show} setShow={setShow} roomId={roomId} />}
      </div>
      <Footer />
    </>
  )
}

export default Home
