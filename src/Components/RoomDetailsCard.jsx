import { Card } from 'react-bootstrap'

function RoomDetailsCard({ room, isOpen, roomId }) {
  function getAverage({ options, voted }) {
    if (voted.length <= 0) return 0
    let total = 0
    options.forEach((option) => {
      total += parseInt(option.votes) * parseInt(option.option)
    })
    return (total / voted.length).toFixed(1)
  }

  return (
    <>
      <Card className="p-3 w-100 w-sm-75 w-md-50 w-lg-25 bg-danger text-light">
        <Card.Title className="text-center"> Room Details</Card.Title>
        <Card.Body className="px-2">
          <Card.Subtitle>
            Room name: <strong className="room-value">{room.roomName}</strong>
          </Card.Subtitle>
          <Card.Subtitle className="mt-1">
            RoomID: <strong className="room-value">{roomId}</strong>
          </Card.Subtitle>
          <Card.Subtitle className="mt-1">
            Total Room members: <strong className="room-value">{room.participants.length}</strong>
          </Card.Subtitle>
          <Card.Subtitle className="mt-1">
            Poll status: <strong className="room-value">{isOpen ? 'Active' : 'Closed'}</strong>
          </Card.Subtitle>
          {room.poll.type === 'estimation' && (
            <Card.Subtitle className="mt-1">
              Average: <strong>{getAverage(room.poll)}</strong>
            </Card.Subtitle>
          )}
        </Card.Body>
      </Card>
    </>
  )
}

export default RoomDetailsCard
