import { useNavigate } from 'react-router-dom'
import Toast from 'react-bootstrap/Toast'
function ToastComponent({ show, setShow, roomId }) {
  const navigate = useNavigate()
  const toggleShow = () => {
    setShow(!show)
    navigate('/create')
  }
  return (
    <div className="toast-container">
    <Toast show={show} onClose={toggleShow}>
      <Toast.Header>
        <strong className="me-auto">Copy room-id</strong>
      </Toast.Header>
      <Toast.Body>{roomId}</Toast.Body>
    </Toast>
    </div>
  )
}

export default ToastComponent
