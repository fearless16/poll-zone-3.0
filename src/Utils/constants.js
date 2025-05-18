export const Messages = {
  NO_POLL_DATA_TO_SHOW: {
    message: 'No poll data show',
    linkMessage: 'Go to poll',
    path: '/poll',
  },
  VOTED: {
    message: 'Voted successfully',
    linkMessage: 'see results',
    path: '/result',
  },
  CREATE_POLL: {
    message: 'No poll present ',
    linkMessage: 'create one',
    path: '/create',
  },
  NO_ACTIVE_POLL: {
    message: 'No active poll, wait for host to create a poll',
    linkMessage: '',
    path: '',
  },
  POLL_CLOSED: {
    message: 'Poll closed',
    linkMessage: 'see results',
    path: '/result',
  },
  NOT_HOST: {
    message: 'Oops you are not the host of this room',
    linkMessage: 'Go to poll page',
    path: '/poll',
  },
  ERROR: {
    message: 'Something went wrong !!',
  },
}

export const REDUCER_ACTIONS = {
  SUCCESS: 'SUCCESS_ACTION',
  LOADING: 'LOADING',
  FAILURE: 'FAILURE',
  VOTED: 'VOTED',
  UNSET_LOADING: 'UNSET_LOADING',
  OPEN: 'OPEN',
  ROOM_EXPIRED: 'ROOM_EXPIRED',
}
