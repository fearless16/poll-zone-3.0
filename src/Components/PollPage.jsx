import { useRoomData } from '../Context/useRoomData'
import { useEffect } from 'react'
import VotingForm from './Forms/VotingForm'
import Loader from './Loader'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import NoPoll from './NoPoll'
import { Messages } from '../Utils/constants'
import { UNSET_LOADING } from '../Context/pollReducer'

const PollPage = () => {
  const { pollState, roomId, dispatch, setRoomId, userId, setUserId } =
    useRoomData()
  const navigate = useNavigate()

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
    navigate('/')
  }

  return (
    <>
      <Header />
      {pollState.loading && <Loader />}
      {!pollState.loading && (
        <>
          {pollState.isHost && !pollState.isPoll && !pollState.isOpen && (
            <NoPoll message={Messages.CREATE_POLL} />
          )}
          {!pollState.isHost && !pollState.isPoll && !pollState.isOpen && (
            <NoPoll message={Messages.NO_ACTIVE_POLL} />
          )}
          {pollState.isOpen && pollState.voted && (
            <NoPoll message={Messages.VOTED} />
          )}
          {!pollState.isOpen && pollState.isPoll && (
            <NoPoll message={Messages.POLL_CLOSED} />
          )}
          {pollState.isPoll &&
          pollState.isOpen &&
            !pollState.voted && (
              <div className="shadow p-3 mb-5 bg-white rounded voting-form">
                <VotingForm pollState={pollState} dispatch={dispatch} />
              </div>
            )}
        </>
      )}
      <Footer />
    </>
  )
}

export default PollPage
