import { useState, useEffect } from 'react'
import { Navbar, Nav, Container } from 'react-bootstrap'
import { Link } from 'react-router'
import { useRoomData } from '../Context/useRoomData'

function NavigationBar() {
  const { pollState } = useRoomData()
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="py-3 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-4 text-uppercase text-light">
          Poll Zone 🔥
        </Navbar.Brand>

        <div className="d-flex align-items-center order-lg-last ms-auto ms-lg-3 gap-2">
          <button
            className="theme-toggle"
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <Navbar.Toggle aria-controls="main-navbar" />
        </div>

        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto gap-3">
            {pollState.isHost && (
              <Nav.Link as={Link} to="/create" className="text-light fw-semibold">
                Create
              </Nav.Link>
            )}
            <Nav.Link as={Link} to="/poll" className="text-light fw-semibold">
              Vote
            </Nav.Link>
            <Nav.Link as={Link} to="/result" className="text-light fw-semibold">
              Result
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default NavigationBar
