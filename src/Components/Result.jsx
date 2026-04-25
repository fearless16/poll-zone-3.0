import { Button, Container, Row, Col, Card, Badge, ListGroup } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Charts from './Chart'
import { closePoll } from '../Firebase/dbHandler'
import Modals from './Modal'
import Loader from './Loader'
import SideBar from './SideBar'
import RoomDetailsCard from './RoomDetailsCard'
import NoPoll from './NoPoll'
import { useRequireRoom } from '../hooks/useRequireRoom'
import { REDUCER_ACTIONS } from '../Utils/constants'
import { Messages } from '../Utils/constants'
import styles from './Result.module.css'

function Result() {
  const [submitted, setSubmitted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()
  const { pollState, roomId, dispatch } = useRequireRoom()

  const handleClick = async () => {
    dispatch({ type: REDUCER_ACTIONS.LOADING })
    setSubmitted(true)
    const totalVotes = pollState.currentPollData?.voted?.length ?? 0
    const totalUsers = pollState.roomData?.participants?.length ?? 0
    if (totalVotes < totalUsers) {
      dispatch({ type: REDUCER_ACTIONS.UNSET_LOADING })
      setSubmitted(false)
      setModalOpen(true)
      return
    }
    try {
      await closePoll(roomId)
      navigate('/create')
    } catch {
      setSubmitted(false)
    } finally {
      dispatch({ type: REDUCER_ACTIONS.UNSET_LOADING })
    }
  }

  return (
    <div className="page-wrapper">
      {(pollState.loading || submitted) && <Loader />}

      {!pollState.loading && !pollState.isPoll && (
        <NoPoll message={Messages.NO_POLL_DATA_TO_SHOW} />
      )}

      {!pollState.loading && pollState.isPoll && !submitted && (
        <main className={`${styles.resultWrapper} bounceIn`}>
          {modalOpen && (
            <Modals
              setModalOpen={setModalOpen}
              modalOpen={modalOpen}
              setSubmitted={setSubmitted}
              navigate={navigate}
              roomId={roomId}
            />
          )}

          <RoomDetailsCard room={pollState.roomData} isOpen={pollState.currentPollData.isOpen} />

          <div className={styles.resultCardWrapper}>
            <Container fluid>
              <Row className="g-4">
                <Col xs={12} md={8}>
                  <Row className="g-4">
                    <Col xs={12} lg={7}>
                      <div className={styles.chartBox}>
                        <Charts chartData={pollState.currentPollData} />
                      </div>
                    </Col>

                    <Col xs={12} lg={5}>
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Header className="fw-semibold text-center">Votes</Card.Header>
                        <Card.Body className="p-0">
                          <ListGroup variant="flush">
                            {pollState.currentPollData.options.map((opt, idx) => (
                              <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center px-3 py-2">
                                <span className="fw-medium">{opt.option}</span>
                                <Badge
                                  bg="primary"
                                  pill
                                  className="px-3 py-2"
                                  style={{ fontSize: '0.9rem', minWidth: '2.5rem' }}
                                >
                                  {opt.votes}
                                </Badge>
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {pollState.isOpen ? (
                    <div className={styles.actionBar}>
                      {pollState.isHost && (
                        <Button onClick={handleClick} disabled={submitted} variant="danger" size="lg">
                          {submitted ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                              Closing...
                            </>
                          ) : (
                            'New poll'
                          )}
                        </Button>
                      )}
                      <Button onClick={() => navigate('/poll')} variant="outline-primary" size="lg">
                        Go to poll
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.closedBanner}>Poll has been closed</div>
                  )}
                </Col>

                <Col xs={12} md={4}>
                  <SideBar voted={pollState.currentPollData.voted} />
                </Col>
              </Row>
            </Container>
          </div>
        </main>
      )}
    </div>
  )
}

export default Result
