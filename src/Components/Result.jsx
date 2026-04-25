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

          <Card className={styles.resultCardWrapper}>
            <Container fluid>
              <Row className="g-3">
                <Col xs={12} md={9}>
                  <Row className="g-3">
                    <Col xs={12} md={7}>
                      <div className={styles.chartBox}>
                        <Charts chartData={pollState.currentPollData} />
                      </div>
                    </Col>

                    <Col xs={12} md={5}>
                      <Card className="border-0" style={{ background: 'var(--card-bg)' }}>
                        <Card.Header className="fw-semibold text-center" style={{ background: 'var(--border-color)', color: 'var(--text-color)' }}>Votes</Card.Header>
                        <Card.Body>
                          <ListGroup variant="flush">
                            {pollState.currentPollData.options.map((opt, idx) => (
                              <ListGroup.Item key={idx} className="d-flex justify-content-between" style={{ background: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                                <span>{opt.option}</span>
                                <Badge
                                  bg="dark"
                                  style={{
                                    fontSize: '1rem',
                                    borderRadius: '1.5rem',
                                    width: '3rem',
                                  }}
                                >
                                  {opt.votes}
                                </Badge>
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Row className="my-4 justify-content-center g-3">
                      {pollState.isOpen && pollState.isHost && (
                        <Col xs="auto">
                          <Button onClick={handleClick} disabled={submitted} variant="danger">
                            {submitted ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-2"
                                  role="status"
                                  aria-hidden="true"
                                />
                                Poll is closing...
                              </>
                            ) : (
                              'New poll'
                            )}
                          </Button>
                        </Col>
                      )}
                      {pollState.isOpen && (
                        <Col xs="auto">
                          <Button onClick={() => navigate('/poll')} variant="secondary">
                            Go to poll
                          </Button>
                        </Col>
                      )}
                    </Row>

                    {!pollState.isOpen && (
                      <Row>
                        <Col className="text-center" style={{ color: 'var(--muted-text)' }}>Poll has been closed</Col>
                      </Row>
                    )}
                  </Row>
                </Col>

                <Col xs={12} md={3}>
                  <SideBar voted={pollState.currentPollData.voted} />
                </Col>
              </Row>
            </Container>
          </Card>
        </main>
      )}
    </div>
  )
}

export default Result
