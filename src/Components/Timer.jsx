import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Timer = ({ expiresAfter }) => {
  const navigate = useNavigate()
  
  const calculateTimeLeft = () => {
    const currentTime = Date.now()
    const difference = expiresAfter - currentTime
    
    if (difference <= 0) {
      return null
    }
    
    return {
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    }
  }
  
  const [timer, setTimer] = useState(calculateTimeLeft())
  
  useEffect(() => {
    const interval = setInterval(() => {
      const timeLeft = calculateTimeLeft()
      setTimer(timeLeft)
      
      if (!timeLeft) {
        localStorage.removeItem('id')
        localStorage.removeItem('roomId')
        localStorage.removeItem('displayName')
        navigate('/')
        clearInterval(interval)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [expiresAfter, navigate])

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
