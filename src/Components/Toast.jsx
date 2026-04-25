import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from 'react-bootstrap/Toast'
import { Button } from 'react-bootstrap'

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
  const [copied, setCopied] = useState(false)

  const toggleShow = () => {
    setShow(false)
    navigate('/create')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS or denied permissions
      const textArea = document.createElement('textarea')
      textArea.value = roomId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="position-fixed top-0 start-50 translate-middle-x p-3 bounceIn"
      style={{ zIndex: 1060 }}
    >
      <Toast show={show} onClose={toggleShow} animation>
        <Toast.Header>
          <strong className="me-auto">Room ID</strong>
        </Toast.Header>
        <Toast.Body className="d-flex justify-content-between align-items-center">
          <span className="font-monospace">{roomId}</span>
          <Button
            size="sm"
            variant={copied ? 'success' : 'outline-dark'}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </Toast.Body>
      </Toast>
    </div>
  )
}

export default ToastComponent
