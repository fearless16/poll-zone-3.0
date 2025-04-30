import { useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { closePoll } from '../Firebase/dbHandler'
import Loader from './Loader'

const Modals = ({ setModalOpen, modalOpen, setSubmitted, roomId , navigate}) => {
  const [loading, setLoading] = useState(() => false)
  const handleClose = () => {
    setModalOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if(!roomId) return
    setLoading(true)
    closePoll(roomId)
      .then((res) => {
        navigate('/create')
      })
      .catch((err) => {
        setLoading(false)
        setSubmitted(false)
      })
  }

  return (
    <>
      {loading && <Loader />}
      {!loading && (
        <Modal show={modalOpen} onHide={handleClose}>
          <Modal.Dialog style={{ width: '95%', height: '100%' }}>
            <Modal.Header closeButton>
              <Modal.Title>Do you want to submit ?</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <p>All participants have not voted yet.</p>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Close
              </Button>
              <Button variant="danger" type="submit" onClick={(e) => handleSubmit(e)}>
                Submit Poll
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal>
      )}
    </>
  )
}

export default Modals
