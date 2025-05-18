import { Badge, Card, Row, Col } from 'react-bootstrap'

const SideBar = ({ voted = [] }) => {
  return (
    <Card className="h-100">
      <Card.Header>
        <Row className="align-items-center">
          <Col className="fw-semibold">Voters</Col>
          <Col xs="auto">
            <Badge bg="secondary">{voted.length}</Badge>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body
        style={{
          overflowY: 'auto',
          maxHeight: '18.75rem',
          paddingRight: '0.5rem',
          fontSize: '1.2rem',
        }}
      >
        {voted.map((voter, idx) => (
          <Row key={voter.id || idx} className="justify-content-between align-items-center mb-2">
            <Col>{voter.name}</Col>
            <Col xs="auto">
              <span
                style={{
                  width: '0.625rem',
                  height: '0.625rem',
                  backgroundColor: 'green',
                  borderRadius: '50%',
                  display: 'inline-block',
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
