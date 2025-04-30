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
      <Card style={{ width: '20rem' , maxWidth: '20rem', padding: '.55rem',}} className="d-flex bg-danger text-light">
        <Card.Title className="text-center"> Room Details</Card.Title>
          <Card.Subtitle>Room name: <strong style={{fontSize:'1.1rem'}}>{room.roomName}</strong></Card.Subtitle>
          <Card.Subtitle className="mt-1">RoomID: <strong style={{fontSize:'1.1rem'}}>{roomId}</strong></Card.Subtitle>
          <Card.Subtitle className="mt-1">
            Total Room members: <strong style={{fontSize:'1.1rem'}}>{room.participants.length}</strong>
            </Card.Subtitle>
            <Card.Subtitle className="mt-1">
              Poll status: <strong style={{fontSize:'1.1rem'}}>{isOpen ? 'Active' : 'Closed'}</strong>
            </Card.Subtitle>
            {room.poll.type === 'estimation' && (
              <Card.Subtitle className="mt-1">Average: <strong>{getAverage(room.poll)}</strong></Card.Subtitle>
            )}
      </Card>
    </>
  )
}

export default RoomDetailsCard
