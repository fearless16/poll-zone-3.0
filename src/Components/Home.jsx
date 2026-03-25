/**
 *
 * This component manages the initial entry point of the app —
 * allows users to create a new poll room or join an existing one.
 * Handles localStorage user info setup and conditional navigation.
 */

import { useState, useRef } from 'react'
import { createRoom, joinPoll } from '../Firebase/dbHandler'
import { Alert, Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import Toast from './Toast'
import styles from './Home.module.css'

/**
 * Home Component
 * @component
 * @returns {JSX.Element} A page with create/join poll functionality
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
   * Submits form to create a new poll room
   * @param {React.FormEvent<HTMLFormElement>} e
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

      setRoomId(response.roomId)
      createNameRef.current.value = ''
      roomNameRef.current.value = ''
      setShow(true)
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setDisabled(false)
    }
  }

  /**
   * Submits form to join an existing poll room
   * @param {React.FormEvent<HTMLFormElement>} e
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
      const { error } = await joinPoll(roomId, name)

      if (error) {
        setError(error.message || 'Failed to join room')
        return
      }

      idRef.current.value = ''
      joinNameRef.current.value = ''
      navigate('/poll')
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setDisabled(false)
    }
  }

  return (
    <div className={styles.homeWrapper}>
      <div className={styles.formContainer}>
        {error && <Alert variant="danger">{error}</Alert>}

        <Card className={styles.formCard}>
          <Card.Body>
            <Card.Title>Create Poll Room</Card.Title>
            <form onSubmit={handleCreateSubmit}>
              <input
                ref={createNameRef}
                type="text"
                className="form-control mb-3"
                placeholder="Enter display name"
                required
              />
              <input
                ref={roomNameRef}
                type="text"
                className="form-control mb-3"
                placeholder="Enter room name"
                required
              />
              <Button type="submit" variant="primary" className="w-100 mt-4" disabled={disabled}>
                Create Poll
              </Button>
            </form>
          </Card.Body>
        </Card>

        <Card className={styles.formCard}>
          <Card.Body>
            <Card.Title>Join Poll Room</Card.Title>
            <form onSubmit={handleJoinSubmit}>
              <input
                ref={joinNameRef}
                type="text"
                className="form-control mb-3"
                placeholder="Enter display name"
                required
              />
              <input
                ref={idRef}
                type="text"
                className="form-control mb-3"
                placeholder="Enter room id"
                required
              />
              <Button type="submit" variant="secondary" className="w-100 mt-4" disabled={disabled}>
                Join Poll
              </Button>
            </form>
          </Card.Body>
        </Card>
      </div>

      {show && <Toast show={show} setShow={setShow} roomId={roomId} />}
    </div>
  )
}

export default Home
