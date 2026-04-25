import { Card, ListGroup, Badge, Row, Col } from 'react-bootstrap'

const RoomDetailsCard = ({ room, isOpen }) => {
  const computeAverage = (options = []) => {
    let totalVotes = 0
    let totalSum = 0

    for (const opt of options) {
      const val = parseFloat(opt.option)
      const votes = opt.votes

      if (!isNaN(val) && votes > 0) {
        totalVotes += votes
        totalSum += val * votes
      }
    }

    if (totalVotes === 0) return '-'

    return (totalSum / totalVotes).toFixed(1)
  }
  const average = computeAverage(room?.poll?.options || [])
  return (
    <Card className="shadow-sm">
      <Card.Header as="h4" className="text-center">Room Details</Card.Header>
      <ListGroup variant="flush">
        <ListGroup.Item>
          <Row>
            <Col xs={6} className="fw-semibold">
              Room name
            </Col>
            <Col xs={6} className="text-end text-truncate">
              {room.roomName}
            </Col>
          </Row>
        </ListGroup.Item>
        <ListGroup.Item>
          <Row>
            <Col xs={6} className="fw-semibold">
              Room ID
            </Col>
            <Col xs={6} className="text-end font-monospace small">
              {room.roomId}
            </Col>
          </Row>
        </ListGroup.Item>
        <ListGroup.Item>
          <Row>
            <Col xs={6} className="fw-semibold">
              Total Members
            </Col>
            <Col xs={6} className="text-end">
              <Badge bg="secondary">{room.participants.length}</Badge>
            </Col>
          </Row>
        </ListGroup.Item>
        <ListGroup.Item>
          <Row>
            <Col xs={6} className="fw-semibold">
              Poll Status
            </Col>
            <Col xs={6} className="text-end">
              <Badge bg={isOpen ? 'success' : 'danger'}>{isOpen ? 'Active' : 'Closed'}</Badge>
            </Col>
          </Row>
        </ListGroup.Item>
        <ListGroup.Item>
          <Row>
            <Col xs={6} className="fw-semibold">
              Average
            </Col>
            <Col xs={6} className="text-end">
              <Badge bg="danger" className="px-3" style={{ fontSize: '1rem' }}>
                {average}
              </Badge>
            </Col>
          </Row>
        </ListGroup.Item>
      </ListGroup>
    </Card>
  )
}

export default RoomDetailsCard
