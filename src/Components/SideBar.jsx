import { Badge, Card, Row, Col } from 'react-bootstrap'

const SideBar = ({ voted = [] }) => {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Header>
        <Row className="align-items-center">
          <Col className="fw-semibold">Voters</Col>
          <Col xs="auto">
            <Badge bg="primary" pill>{voted.length}</Badge>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body
        style={{
          overflowY: 'auto',
          maxHeight: '18.75rem',
          paddingRight: '0.5rem',
        }}
      >
        {voted.length === 0 && (
          <p className="text-center mb-0" style={{ color: 'var(--muted-text)', fontSize: '0.9rem' }}>No votes yet</p>
        )}
        {voted.map((voter, idx) => (
          <Row key={voter.id || idx} className="justify-content-between align-items-center mb-2 py-1 px-2 rounded" style={{ transition: 'background-color 150ms ease' }}>
            <Col style={{ fontWeight: 500 }}>{voter.name}</Col>
            <Col xs="auto">
              <span
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  backgroundColor: 'var(--success-color)',
                  borderRadius: '50%',
                  display: 'inline-block',
                  boxShadow: '0 0 4px var(--success-color)',
                }}
              ></span>
            </Col>
          </Row>
        ))}
      </Card.Body>
    </Card>
  )
}

export default SideBar
