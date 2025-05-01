import { useState, useRef } from 'react'
import { createRoom, joinPoll } from '../Firebase/dbHandler'
import { Alert, Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import Toast from './Toast'
import Header from './Header'
import Footer from './Footer'

/**
 * Home Component
 * Handles creation and joining of poll rooms.
 * Uses React-Bootstrap for layout and styling.
 */
function Home() {
  const [error, setError] = useState(null)
  const [disabled, setDisabled] = useState(false)
  const [show, setShow] = useState(false)
  const [roomId, setRoomId] = useState('')

  const idRef = useRef()
  const roomNameRef = useRef()
  const createNameRef = useRef()
  const joinNameRef = useRef()

  const navigate = useNavigate()

  /**
   * Handles "Create Poll Room" form submission.
   * Calls Firestore to create a new room and stores roomId in localStorage.
   * Shows toast on success.
   *
   * @param {Event} e - Form submit event
   */
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setDisabled(true)
    setError(null)

    try {
      const name = createNameRef.current.value
      const roomName = roomNameRef.current.value

      const { response, error } = await createRoom(name, roomName)

      if (error) {
        setError(error.message || 'Failed to create room')
        return
      }

      // Store the generated room ID
      localStorage.setItem('roomId', response.roomId)
      setRoomId(response.roomId)

      // Reset form + show toast
      createNameRef.current.value = ''
      roomNameRef.current.value = ''
      setShow(true)
    } catch (err) {
      console.error('Create Room Error:', err)
      setError('Something went wrong')
    } finally {
      setDisabled(false)
    }
  }

  /**
   * Handles "Join Poll Room" form submission.
   * Validates room ID and display name, stores info in localStorage,
   * and navigates to the /poll route on success.
   *
   * @param {Event} e - Form submit event
   */
  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    setDisabled(true)
    setError(null)

    const roomId = idRef.current.value.trim()
    const name = joinNameRef.current.value.trim()

    if (!roomId || !name) {
      setError('Display name and Room ID are required.')
      setDisabled(false)
      return
    }

    try {
      localStorage.setItem('roomId', roomId)
      const { response, error } = await joinPoll(roomId, name)

      if (error) {
        setError(error.message || 'Failed to join room')
        return
      }

      // Clear inputs and route to /poll
      idRef.current.value = ''
      joinNameRef.current.value = ''
      navigate('/poll')
    } catch (err) {
      console.error('Join Room Error:', err)
      setError('Something went wrong')
    } finally {
      setDisabled(false)
    }
  }

  return (
    <>
      <Header />

      <div className="home-div">
        <div className="form-div">
          {/* Error Display */}
          {error && <Alert variant="danger">{error}</Alert>}

          {/* 🔹 Create Poll Section */}
          <Card style={{ width: '30rem' }} className="shadow p-3 mb-5 bg-white rounded m-2">
            <Card.Body>
              <Card.Title>Create Poll Room</Card.Title>
              <form onSubmit={handleCreateSubmit}>
                <input
                  ref={createNameRef}
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter display name"
                  required
                />
                <input
                  ref={roomNameRef}
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter room name"
                  required
                />
                <Button type="submit" variant="primary" className="m-2" disabled={disabled}>
                  Create Poll
                </Button>
              </form>
            </Card.Body>
          </Card>

          {/* 🔸 Join Poll Section */}
          <Card style={{ width: '30rem' }} className="shadow p-3 mb-5 bg-white rounded m-2">
            <Card.Body>
              <Card.Title>Join Poll Room</Card.Title>
              <form onSubmit={handleJoinSubmit}>
                <input
                  ref={joinNameRef}
                  type="text"
                  className="form-control mb-2"
                  placeholder="Enter display name"
                  required
                />
                <input
                  ref={idRef}
                  type="text"
                  className="form-control mb-2"
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

        {/* ✅ Toast Notification after room creation */}
        {show && <Toast show={show} setShow={setShow} roomId={roomId} />}
      </div>

      <Footer />
    </>
  )
}

export default Home
