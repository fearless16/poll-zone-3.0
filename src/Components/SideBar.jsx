import { Badge, Card, Row, Col } from 'react-bootstrap'

const SideBar = ({ voted = [] }) => {
  return (
    <Card className="h-100">
      <Card.Header>
        <Row className="align-items-center">
          <Col className="fw-semibold">Voters</Col>
          <Col xs="auto">
            <Badge bg="dark">{voted.length}</Badge>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body
        style={{
          overflowY: 'auto',
          maxHeight: '18.75rem',
          fontSize: '1.1rem',
        }}
      >
        {voted.length === 0 && (
          <p className="text-center text-muted mb-0">No votes yet</p>
        )}
        {voted.map((voter, idx) => (
          <div
            key={voter.id || idx}
            className="d-flex justify-content-between align-items-center py-2"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <span>{voter.name}</span>
            <span
              style={{
                width: '0.625rem',
                height: '0.625rem',
                backgroundColor: 'green',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            ></span>
          </div>
        ))}
      </Card.Body>
    </Card>
  )
}

export default SideBar
