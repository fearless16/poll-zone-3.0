import { useRequireRoom } from '../hooks/useRequireRoom'
import VotingForm from './Forms/VotingForm'
import Loader from './Loader'
import NoPoll from './NoPoll'
import { Messages } from '../Utils/constants'
import { Container, Row, Col } from 'react-bootstrap'

const PollPage = () => {
  const { pollState, dispatch } = useRequireRoom()

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
