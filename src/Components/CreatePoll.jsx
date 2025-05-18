import { useState, useEffect } from 'react'
import Estimation from './Estimation'
import Voting from './Voting'
import Loader from './Loader'
import { useRoomData } from '../Context/useRoomData'
import { useNavigate } from 'react-router-dom'
import BootstrapSwitchButton from 'bootstrap-switch-button-react'
import NoPoll from './NoPoll'
import { Messages } from '../Utils/constants'
import { REDUCER_ACTIONS } from '../Utils/constants'
import { Container, Row, Col, Card } from 'react-bootstrap'

function CreatePoll() {
  const [pollType, setPollType] = useState('est')
  const { pollState, roomId, setRoomId, userId, setUserId, dispatch } = useRoomData()
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
    return () => {
      dispatch({ type: REDUCER_ACTIONS.UNSET_LOADING })
    }
  }, [])

  if ((!roomId || !userId) && !pollState.loading) navigate('/')

  return (
    <div className="page">
      {pollState.loading && <Loader />}

      {!pollState.loading && !pollState.isHost && <NoPoll message={Messages.NOT_HOST} />}

      {!pollState.loading && pollState.isHost && (
        <Container className="mt-5">
          <Row className="justify-content-center">
            <Col xs={12} md={8} lg={6}>
              <Card className="p-4 shadow-lg p-3 mb-5 bg-white rounded bounceIn">
                <div className="d-flex justify-content-center mb-4">
                  <BootstrapSwitchButton
                    checked={pollType === 'est'}
                    width={120}
                    onlabel="Estimation"
                    offlabel="Voting"
                    onstyle="secondary"
                    offstyle="info"
                    onChange={(checked) => (checked ? setPollType('est') : setPollType('vote'))}
                  />
                </div>
                {pollType === 'est' ? <Estimation /> : <Voting />}
              </Card>
            </Col>
          </Row>
        </Container>
      )}
    </div>
  )
}

export default CreatePoll
