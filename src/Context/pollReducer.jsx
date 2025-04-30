export const SUCCESS = 'SUCCESS_ACTION'
export const LOADING = 'LOADING'
export const FAILURE = 'FAILURE'
export const VOTED = 'VOTED'
export const UNSET_LOADING = 'UNSET_LOADING'
export const OPEN = 'OPEN'
export const ROOM_EXPIRED = 'ROOM_EXPIRED'

const isVoted = ({ voted }, userId) => {
  if (!voted || !userId) {
    return false
  }
  return voted.find((voter) => voter.id === userId) ? true : false
}

const isPoll = (poll) => {
  if (!poll) {
    return false
  }

  return Object.keys(poll).length !== 0
}

const isHost = ({ host }, userId) => {
  if (!userId) return

  return host === userId
}

export const pollReducer = (state, action) => {
  switch (action.type) {
    case SUCCESS:
      if (!action.payload?.poll || Object.keys(action.payload.poll).length === 0) {
        return state
      }
      return {
        ...state,
        currentPollData: action.payload.poll,
        roomData: action.payload,
        error: '',
        isHost: isHost(action.payload, action.payload.userId),
        isOpen: action.payload.poll.isOpen,
        voted: isVoted(action.payload.poll, action.payload.userId),
        isPoll: isPoll(action.payload.poll),
      }
    case OPEN:
      return { ...state, isOpen: true }
    case VOTED:
      return { ...state, voted: true }
    case LOADING:
      return { ...state, loading: true }
    case UNSET_LOADING:
      return { ...state, loading: false }
    case FAILURE:
      return { ...state, loading: false, error: 'Something went wrong' }
    default:
      return state
  }
}
