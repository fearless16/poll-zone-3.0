import { onSnapshot, doc } from 'firebase/firestore'
import { useContext, createContext, useEffect, useReducer, useState } from 'react'
import { db } from '../Firebase/config'
import { SUCCESS, pollReducer } from './pollReducer'

export const RoomDataContext = createContext()

export const useRoomData = () => {
  return useContext(RoomDataContext)
}

export const RoomDataContextProvider = ({ children }) => {
  const [pollState, dispatch] = useReducer(pollReducer, {
    loading: true,
    currentPollData: {},
    roomData: {},
    error: '',
    isHost: false,
    isOpen: false,
    voted: false,
    isPoll: false,
  })
  const [roomId, setRoomId] = useState(() => '')
  const [userId, setUserId] = useState(() => '')

  useEffect(() => {
    if (!roomId || !userId) return

    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (docSnapshot) => {
      const data = docSnapshot.data()
      if (!data || !data.poll || Object.keys(data.poll).length === 0) return

      const payload = {
        ...data,
        userId,
        roomId,
      }

      if (!docSnapshot.metadata.hasPendingWrites) {
        dispatch({ type: SUCCESS, payload })
      } else {
        console.log('⏳ Skipping optimistic write, waiting for server confirmation')
      }
    })

    return () => unsubscribe()
  }, [roomId, userId])

  const value = {
    roomId,
    pollState,
    dispatch,
    setRoomId,
    userId,
    setUserId,
  }

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>
}
