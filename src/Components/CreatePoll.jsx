import { useState, useEffect } from 'react'
import Estimation from './Estimation'
import Voting from './Voting'
import Loader from './Loader'
import { useRoomData } from '../Context/useRoomData'
import { useNavigate } from 'react-router-dom'
import BootstrapSwitchButton from 'bootstrap-switch-button-react'
import Header from './Header'
import Footer from './Footer'
import NoPoll from './NoPoll'
import { Messages } from '../Utils/constants'
// import Timer from './Timer'

function CreatePoll() {
  const [pollType, setPollType] = useState('est')
  const { pollState, roomId, setRoomId, userId, setUserId } = useRoomData()
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
  }, [])

  if ((!roomId || !userId) && !pollState.loading) {
    return navigate('/')
  }

  return (
    <>
      <Header />
      {pollState.loading && <Loader />}
      {!pollState.loading && !pollState.isHost && <NoPoll message={Messages.NOT_HOST} />}
      {!pollState.loading && pollState.isHost && (
        <>
            <div className="mx-auto" style={{ width: '50%' }}>
              <>
                <div className="mb-4">
                  <BootstrapSwitchButton
                    checked={true}
                    width={110}
                    onlabel="Estimation"
                    offlabel="Voting"
                    onstyle="secondary"
                    offstyle="info"
                    onChange={(checked) =>
                      checked ? setPollType('est') : setPollType('vote')
                    }
                  />
                </div>
                {pollType === 'est' ? <Estimation /> : <Voting />}
              </>
            </div>
        </>
      )}
      <Footer />
    </>
  )
}

export default CreatePoll
