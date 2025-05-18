import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { REDUCER_ACTIONS } from '../Utils/constants'
import { useRoomData } from '../Context/useRoomData'
const Timer = ({ expiresAfter }) => {
  const { dispatch } = useRoomData()
  const [timer, setTimer] = useState(() => {})
  const navigate = useNavigate()
  const calculateTimeLeft = () => {
    const currentTime = Date.now()
    const difference = expiresAfter - currentTime
    if (currentTime > expiresAfter) {
      localStorage.removeItem('id')
      localStorage.removeItem('roomId')
      localStorage.removeItem('displayName')
      dispatch({ type: REDUCER_ACTIONS.ROOM_EXPIRED })
      navigate('/')
      return
    }
    return {
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    }
  }
  useEffect(() => {
    const timerFunction = setTimeout(() => {
      const timeLeft = calculateTimeLeft()
      setTimer(timeLeft)
    }, 1000)
    return () => clearTimeout(timerFunction)
  }, [timer])

  return (
    <>
      <div className="timer mb-2">
        {!timer && <p>Calculating session timer...</p>}
        {timer && (
          <>
            <strong>Session will expire in: </strong>
            <span>
              {timer.minutes < 10 ? `0${timer.minutes}` : timer.minutes} :
              {timer.seconds < 10 ? ` 0${timer.seconds}` : ` ${timer.seconds}`} minutes left
            </span>
          </>
        )}
      </div>
    </>
  )
}

export default Timer
