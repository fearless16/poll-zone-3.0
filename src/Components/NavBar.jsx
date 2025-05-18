import { Navbar, Nav, Container } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useRoomData } from '../Context/useRoomData'

function NavigationBar() {
  const { pollState } = useRoomData()

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="py-3 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-4 text-uppercase text-light">
          Poll Zone 🔥
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />

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
