import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      className="position-fixed top-0 start-0 w-100 d-flex justify-content-center bounceIn"
      style={{ zIndex: 1060, paddingTop: '1rem' }}
    >
      <Toast
        show={show}
        onClose={toggleShow}
        animation
        className="shadow-lg border-0"
        style={{ minWidth: '22rem' }}
      >
        <Toast.Header className="border-0 pb-0">
          <strong className="me-auto fs-6">Room Created!</strong>
        </Toast.Header>
        <Toast.Body>
          <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
            Share this ID with your team to join:
          </p>
          <div
            className="d-flex align-items-center justify-content-between rounded px-3 py-2 mb-2"
            style={{ backgroundColor: 'var(--background-color)' }}
          >
            <code className="fw-bold fs-5" style={{ color: 'var(--text-color)', letterSpacing: '0.05em' }}>
              {roomId}
            </code>
            <Button
              size="sm"
              variant={copied ? 'success' : 'dark'}
              onClick={handleCopy}
              style={{ minWidth: '4.5rem' }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
        </Toast.Body>
      </Toast>
    </div>
  )
}

export default ToastComponent
