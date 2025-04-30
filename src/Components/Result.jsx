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
import { Messages} from '../Utils/constants'

function Result() {
  const [submitted, setSubmitted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const { pollState, roomId, userId, dispatch, setRoomId, setUserId} = useRoomData()
  const handleClick = () => {
    dispatch({ type: LOADING })
    if (
      pollState.currentPollData.voted.length <
      pollState.roomData.participants.length
    ) {
      dispatch({ type: UNSET_LOADING })
      setModalOpen(true)
    }
    if (
      pollState.currentPollData.voted.length ===
        pollState.roomData.participants.length ||
      submitted
    ) {
      dispatch({ type: LOADING })
      closePoll(roomId)
        .then((res) => {
          navigate('/create')
          dispatch({ type: UNSET_LOADING })
        })
        .catch((err) => {
          dispatch({ type: UNSET_LOADING })
          setSubmitted(false)
        })
    }
  }

  useEffect(() => {
    if (!roomId || !userId) {
      if (localStorage.getItem('roomId') && localStorage.getItem('id')) {
        setRoomId(localStorage.getItem('roomId'))
        setUserId(localStorage.getItem('id'))
      } else {
        navigate('/')
      }
    }
    return () => {
      dispatch({ type: UNSET_LOADING })
    }
  }, [])

  if ((!roomId || !userId) && !pollState.loading) {
    return navigate('/')
  }

  return (
    <>
      <Header />
      {(pollState.loading || submitted) && <Loader />}
      {!pollState.loading && !pollState.isPoll && <NoPoll message = {Messages.NO_POLL_DATA_TO_SHOW}/>}
      {!pollState.loading && pollState.isPoll && !submitted && (
        <>
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
                <Card.Title className="text-center mt-2">Poll Statistics</Card.Title> 
              )}
              {pollState.currentPollData && (
                <div className="chart d-flex justify-content-between mb-2 ">
                  <Charts chartData={pollState.currentPollData} />
                </div>
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
        </>
      )}
      <Footer />
    </>
  )
}

export default Result
