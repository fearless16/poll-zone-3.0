import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useRoomData } from '../Context/useRoomData'
import { REDUCER_ACTIONS } from '../Utils/constants'

/**
 * Hook that hydrates roomId/userId from localStorage into context,
 * and redirects to Home if neither context nor localStorage has them.
 * Unsets loading on cleanup.
 */
export const useRequireRoom = () => {
  const { pollState, dispatch, roomId, setRoomId, userId, setUserId } = useRoomData()
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
    return () => dispatch({ type: REDUCER_ACTIONS.UNSET_LOADING })
  }, [])

  useEffect(() => {
    if ((!roomId || !userId) && !pollState.loading) navigate('/')
  }, [roomId, userId, pollState.loading])

  return { pollState, dispatch, roomId, userId }
}
