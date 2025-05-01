import { useNavigate } from 'react-router-dom'
import Toast from 'react-bootstrap/Toast'

/**
 * ToastComponent
 * Shows a temporary alert (with roomId) after room creation.
 * Navigates to /create after dismiss.
 *
 * @param {boolean} show - Whether to show the toast
 * @param {function} setShow - Setter for toast visibility
 * @param {string} roomId - The newly created room's ID
 */
function ToastComponent({ show, setShow, roomId }) {
  const navigate = useNavigate()

  // Called when toast is closed
  const toggleShow = () => {
    setShow(false)
    navigate('/create') // Navigate to create screen for host
  }

  return (
    <div className="position-fixed top-0 start-50 translate-middle-x p-3" style={{ zIndex: 1060 }}>
      <Toast show={show} onClose={toggleShow} animation>
        <Toast.Header>
          <strong className="me-auto">Copy room-id</strong>
        </Toast.Header>
        <Toast.Body>{roomId}</Toast.Body>
      </Toast>
    </div>
  )
}

export default ToastComponent
