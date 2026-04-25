import { Messages, REDUCER_ACTIONS } from '../Utils/constants'

const isVoted = ({ voted }, userId) => {
  if (!Array.isArray(voted) || !userId) {
    return false
  }
  return voted.some((voter) => voter.id === userId)
}

const isPoll = (poll) => !!poll && Object.keys(poll).length > 0

const isHost = ({ host }, userId) => !!userId && host === userId

export const pollReducer = (state, action) => {
  switch (action.type) {
    case REDUCER_ACTIONS.SUCCESS: {
      const voted = isVoted(action.payload?.poll || {}, action.payload.userId)
      return {
        ...state,
        loading: false,
        currentPollData: action.payload.poll,
        roomData: action.payload,
        error: '',
        isHost: isHost(action.payload, action.payload.userId),
        isOpen: !!action.payload?.poll?.isOpen,
        voted,
        isPoll: isPoll(action.payload.poll),
      }
    }
    case REDUCER_ACTIONS.OPEN:
      return { ...state, isOpen: true }
    case REDUCER_ACTIONS.LOADING:
      return { ...state, loading: true }
    case REDUCER_ACTIONS.UNSET_LOADING:
      return { ...state, loading: false }
    case REDUCER_ACTIONS.FAILURE:
      return { ...state, loading: false, error: Messages.ERROR.message }
    default:
      return state
  }
}
