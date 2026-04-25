import { useState } from 'react'
import Estimation from './Estimation'
import Voting from './Voting'
import Loader from './Loader'
import { useRequireRoom } from '../hooks/useRequireRoom'
import BootstrapSwitchButton from 'bootstrap-switch-button-react'
import NoPoll from './NoPoll'
import { Messages } from '../Utils/constants'
import { Container, Row, Col, Card } from 'react-bootstrap'

function CreatePoll() {
  const [pollType, setPollType] = useState('est')
  const { pollState } = useRequireRoom()

  return (
    <div className="page">
      {pollState.loading && <Loader />}

      {!pollState.loading && !pollState.isHost && <NoPoll message={Messages.NOT_HOST} />}

      {!pollState.loading && pollState.isHost && (
        <Container className="mt-5">
          <Row className="justify-content-center">
            <Col xs={12} md={8} lg={6}>
              <Card className="p-4 shadow-sm mb-5 rounded-3 bounceIn" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <div className="d-flex justify-content-center mb-4">
                  <BootstrapSwitchButton
                    checked={pollType === 'est'}
                    width={120}
                    onlabel="Estimation"
                    offlabel="Voting"
                    onstyle="dark"
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
