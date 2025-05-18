import { useRoomData } from '../Context/useRoomData'
import { useEffect } from 'react'
import VotingForm from './Forms/VotingForm'
import Loader from './Loader'
import { useNavigate } from 'react-router-dom'
import NoPoll from './NoPoll'
import { Messages, REDUCER_ACTIONS } from '../Utils/constants'
import { Container, Row, Col } from 'react-bootstrap'

const PollPage = () => {
  const { pollState, roomId, dispatch, setRoomId, userId, setUserId } = useRoomData()
  const navigate = useNavigate()

  useEffect(() => {
    if (!roomId || !userId) {
      const storedRoom = localStorage.getItem('roomId')
      const storedUser = localStorage.getItem('id')
      if (storedRoom && storedUser) {
        setRoomId(storedRoom)
        setUserId(storedUser)
      } else {
        navigate('/')
      }
    }
    return () => dispatch({ type: REDUCER_ACTIONS.UNSET_LOADING })
  }, [])

  useEffect(() => {
    if ((!roomId || !userId) && !pollState.loading) navigate('/')
  }, [roomId, userId, pollState.loading])

  const renderPollState = () => {
    const { isHost, isPoll, isOpen, voted } = pollState

    if (isHost && !isPoll && !isOpen) return <NoPoll message={Messages.CREATE_POLL} />
    if (!isHost && !isPoll && !isOpen) return <NoPoll message={Messages.NO_ACTIVE_POLL} />
    if (isOpen && voted) return <NoPoll message={Messages.VOTED} />
    if (!isOpen && isPoll) return <NoPoll message={Messages.POLL_CLOSED} />

    if (isPoll && isOpen && !voted) {
      return <VotingForm pollState={pollState} dispatch={dispatch} />
    }

    return null
  }

  return (
    <div className="page-wrapper">
      {pollState.loading ? (
        <Loader />
      ) : (
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={8} lg={6}>
              {renderPollState()}
            </Col>
          </Row>
        </Container>
      )}
    </div>
  )
}

export default PollPage
