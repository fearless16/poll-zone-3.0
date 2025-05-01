import { Button, Card } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Charts from './Chart'
import { closePoll } from '../Firebase/dbHandler'
import Modals from './Modal'
import Loader from './Loader'
import SideBar from './SideBar'
import RoomDetailsCard from './RoomDetailsCard'
import Header from './Header'
import Footer from './Footer'
import NoPoll from './NoPoll'
import { useRoomData } from '../Context/useRoomData'
import { LOADING, UNSET_LOADING } from '../Context/pollReducer'
import { Messages } from '../Utils/constants'

/*
  ----------------------------------------------------------------------
  📊 Result Component
  Shows real-time result of poll, handles poll closure,
  loader state, navigation and access control
  ----------------------------------------------------------------------
*/
function Result() {
  const [submitted, setSubmitted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const {
    pollState,
    roomId,
    userId,
    dispatch,
    setRoomId,
    setUserId,
  } = useRoomData()

  /*
    ----------------------------------------------------------------------
    🛑 Access Control: Check roomId & userId
    Fallback to localStorage or navigate to home
    ----------------------------------------------------------------------
  */
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

    return () => {
      dispatch({ type: UNSET_LOADING })
    }
  }, [])

  /*
    ----------------------------------------------------------------------
    🔁 Reactively Redirect if roomId/userId missing post-load
    Prevents access if context was not initialized
    ----------------------------------------------------------------------
  */
  useEffect(() => {
    if ((!roomId || !userId) && !pollState.loading) {
      navigate('/')
    }
  }, [roomId, userId, pollState.loading])

  /*
    ----------------------------------------------------------------------
    🚨 Handle "New Poll" button click
    Validates if all users have voted before allowing poll closure
    Shows modal if votes are pending
    ----------------------------------------------------------------------
  */
  const handleClick = async () => {
    dispatch({ type: LOADING })

    const totalVotes = pollState.currentPollData.voted.length
    const totalUsers = pollState.roomData.participants.length

    if (totalVotes < totalUsers) {
      dispatch({ type: UNSET_LOADING })
      setModalOpen(true)
      return
    }

    if (totalVotes === totalUsers || submitted) {
      try {
        await closePoll(roomId)
        navigate('/create')
      } catch (err) {
        setSubmitted(false)
      } finally {
        dispatch({ type: UNSET_LOADING })
      }
    }
  }

  return (
    <>
      <Header />

      {(pollState.loading || submitted) && <Loader />}

      {!pollState.loading && !pollState.isPoll && (
        <NoPoll message={Messages.NO_POLL_DATA_TO_SHOW} />
      )}

      {!pollState.loading && pollState.isPoll && !submitted && (
        <div className="result-container mx-auto d-flex btn-container z-index">
          {modalOpen && (
            <Modals
              setModalOpen={setModalOpen}
              modalOpen={modalOpen}
              setSubmitted={setSubmitted}
              navigate={navigate}
              roomId={roomId}
            />
          )}

          <Card style={{ width: '100%', maxHeight: '700px' }}>
            {pollState.currentPollData && (
              <>
                <Card.Title className="text-center mt-2">Poll Statistics</Card.Title>
                <div className="chart d-flex justify-content-between mb-2">
                  <Charts chartData={pollState.currentPollData} />
                </div>
              </>
            )}

            <div className="mx-auto">
              {pollState.isOpen && pollState.isHost && (
                <Button
                  onClick={handleClick}
                  disabled={submitted}
                  style={{ cursor: 'pointer', marginTop: '-2rem' }}
                  variant="danger"
                >
                  New poll
                </Button>
              )}

              {pollState.isOpen && (
                <Button
                  onClick={() => navigate('/poll')}
                  style={{
                    cursor: 'pointer',
                    marginTop: '-2rem',
                    marginLeft: '.5rem',
                  }}
                  variant="secondary"
                >
                  Go to poll
                </Button>
              )}

              {!pollState.isOpen && <p>Poll has been closed</p>}

              <div className="room-details">
                {pollState.roomData && (
                  <RoomDetailsCard
                    room={pollState.roomData}
                    roomId={roomId}
                    isOpen={pollState.currentPollData.isOpen}
                  />
                )}
              </div>
            </div>
          </Card>

          {pollState.currentPollData && (
            <SideBar voted={pollState.currentPollData.voted} />
          )}
        </div>
      )}

      <Footer />
    </>
  )
}

export default Result
