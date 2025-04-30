import { useState, useEffect } from 'react'
import { ListGroup, Stack } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircle } from '@fortawesome/free-solid-svg-icons'

const SideBar = ({ voted }) => {
  const [voters, setVoters] = useState([...voted])

  useEffect(() => {
    if (!voted) {
      return
    }
    setVoters(() => [...voted])
  }, [voted])

  function renderData(voter) {
    return (
      <ListGroup.Item
        as="li"
        className="border-0 d-flex justify-content-between"
        key={voter.id}
      >
        <div>
          <h5 style={{ marginLeft: '-1rem' }}>{voter.name}</h5>
        </div>
        <div style={{ marginLeft: '2.5rem', color: '#4CAF50' }}>
          <FontAwesomeIcon icon={faCircle} />
        </div>
      </ListGroup.Item>
    )
  }

  return (
    <div className="sidebar card ">
      <Stack
        direction="horizontal"
        className="d-flex justify-content-between"
        gap={3}
      >
        <h4>Voters</h4>
        <span className="font-weight-bold">{voted && voted.length}</span>
      </Stack>
      <hr style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem' }} />
      {voted && (
        <ListGroup as="ul" className="border-none overflow-auto">
          {voters.map((voter) => renderData(voter))}
        </ListGroup>
      )}
      {voted.length === 0 && <span>No one has voted yet!</span>}
    </div>
  )
}

export default SideBar
