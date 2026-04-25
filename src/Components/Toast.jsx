import { useState } from 'react'
import { useNavigate } from 'react-router'
import Toast from 'react-bootstrap/Toast'
import { Button } from 'react-bootstrap'

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
          <strong className="me-auto">Room Created</strong>
        </Toast.Header>
        <Toast.Body>
          <div className="d-flex align-items-center justify-content-between gap-2">
            <span
              className="font-monospace text-truncate"
              style={{ fontSize: '0.9rem', maxWidth: '14rem' }}
              title={roomId}
            >
              {roomId}
            </span>
            <Button
              size="sm"
              variant={copied ? 'success' : 'outline-dark'}
              onClick={handleCopy}
              style={{ whiteSpace: 'nowrap' }}
            >
              {copied ? 'Copied!' : 'Copy ID'}
            </Button>
          </div>
        </Toast.Body>
      </Toast>
    </div>
  )
}

export default ToastComponent
