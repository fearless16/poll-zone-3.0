import { useState } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
import { closePoll } from '../Firebase/dbHandler'

/**
 * Confirmation modal to submit poll forcibly
 *
 * @param {function} setModalOpen - function to toggle modal visibility
 * @param {boolean} modalOpen - current modal state
 * @param {function} setSubmitted - poll submit state toggle
 * @param {string} roomId - current room ID
 * @param {function} navigate - react-router navigation
 */
const Modals = ({ setModalOpen, modalOpen, setSubmitted, roomId, navigate }) => {
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    if (!loading) setModalOpen(false)
  }

  const handleSubmit = async () => {
    if (!roomId) return

    try {
      setLoading(true)
      await closePoll(roomId)
      navigate('/create')
    } catch (err) {
      setSubmitted(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={modalOpen} onHide={handleClose} centered backdrop="static" keyboard={!loading}>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>Submit Poll?</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-4">
            <Spinner animation="border" variant="info" role="status" />
          </div>
        ) : (
          <p className="text-muted mb-0">All participants have not voted yet. Are you sure?</p>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={loading}>
          Submit Anyway
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default Modals
