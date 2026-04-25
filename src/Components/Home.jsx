/**
 *
 * This component manages the initial entry point of the app —
 * allows users to create a new poll room or join an existing one.
 * Handles localStorage user info setup and conditional navigation.
 */

import { useState, useRef } from 'react'
import { createRoom, joinPoll } from '../Firebase/dbHandler'
import { Alert, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router'
import Toast from './Toast'
import styles from './Home.module.css'

/**
 * Home Component
 * @component
 * @returns {JSX.Element} A page with create/join poll functionality
 */
function Home() {
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
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
    setCreating(true)
    setError(null)

    try {
      const name = createNameRef.current.value
      const roomName = roomNameRef.current.value

      const { response, error } = await createRoom(name, roomName)
      if (error) {
        setError(error.message || 'Failed to create room')
        return
      }

      localStorage.setItem('id', response.hostId)
      localStorage.setItem('displayName', name)
      localStorage.setItem('roomId', response.roomId)
      setRoomId(response.roomId)
      createNameRef.current.value = ''
      roomNameRef.current.value = ''
      setShow(true)
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  /**
   * Submits form to join an existing poll room
   * @param {React.FormEvent<HTMLFormElement>} e
   */
  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    setJoining(true)
    setError(null)

    const roomId = idRef.current.value.trim()
    const name = joinNameRef.current.value.trim()

    if (!roomId || !name) {
      setError('Display name and Room ID are required.')
      setJoining(false)
      return
    }

    try {
      localStorage.setItem('roomId', roomId)
      const { response, error } = await joinPoll(roomId, name)

      if (error) {
        setError(error.message || 'Failed to join room')
        return
      }

      localStorage.setItem('id', response.userId)
      localStorage.setItem('displayName', name)
      idRef.current.value = ''
      joinNameRef.current.value = ''
      navigate('/poll')
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={styles.homeWrapper}>
      <h1 className={styles.heroTitle}>Welcome to Poll Zone</h1>
      <p className={styles.heroSubtitle}>Create a room to start polling, or join an existing one</p>

      <div className={styles.formContainer}>
        {error && (
          <Alert variant="danger" className="w-100" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Create Room</h2>
            <p className={styles.cardSubtitle}>Start a new poll session as host</p>
          </div>
          <div className={styles.cardBody}>
            <form onSubmit={handleCreateSubmit}>
              <div className="mb-3">
                <input
                  ref={createNameRef}
                  type="text"
                  className="form-control"
                  placeholder="Your display name"
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  ref={roomNameRef}
                  type="text"
                  className="form-control"
                  placeholder="Room name"
                  required
                />
              </div>
              <Button type="submit" variant="dark" className="w-100 py-2" disabled={creating}>
                {creating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Creating...
                  </>
                ) : (
                  'Create Room'
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className={styles.dividerText}>or</div>

        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Join Room</h2>
            <p className={styles.cardSubtitle}>Enter a room ID to participate</p>
          </div>
          <div className={styles.cardBody}>
            <form onSubmit={handleJoinSubmit}>
              <div className="mb-3">
                <input
                  ref={joinNameRef}
                  type="text"
                  className="form-control"
                  placeholder="Your display name"
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  ref={idRef}
                  type="text"
                  className="form-control font-monospace"
                  placeholder="Room ID"
                  required
                />
              </div>
              <Button type="submit" variant="dark" className="w-100 py-2" disabled={joining}>
                {joining ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {show && <Toast show={show} setShow={setShow} roomId={roomId} />}
    </div>
  )
}

export default Home
