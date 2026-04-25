# 🗳️ Poll Zone — Realtime Voting System

A lightning-fast, race-condition-proof voting system built with **React**, **Firebase Firestore**, and **transactional vote casting**. Supports real-time updates, prevents double voting, and handles concurrency gracefully.

**Live:** [https://poll-zone.web.app](https://poll-zone.web.app)

---

## Features

- **Realtime poll updates** via Firestore `onSnapshot` listeners
- **Transactional vote casting** using `runTransaction()` — no race conditions
- **Double voting prevention** at UI, reducer, and database layers
- **Two poll types:** Standard voting polls and estimation (story point) polls
- **Dark / Light mode** toggle with `localStorage` persistence
- **Room-based sessions** — host creates a room, participants join with a Room ID
- **Responsive UI** — Bootstrap 5 with CSS custom properties

---

## Tech Stack

| Tech               | Usage                         |
| ------------------ | ----------------------------- |
| React 18           | Frontend (JSX + hooks)        |
| React Router v7    | Client-side routing           |
| React Bootstrap 2  | UI component library          |
| Firebase Firestore | Real-time database            |
| Vite 6             | Dev server + production build |
| Vitest 3           | Unit + integration tests      |
| Firebase Hosting   | Deployment                    |
| Iconify            | Icon library                  |

---

## Folder Structure

```
src/
├── Components/          # UI — NavBar, Home, PollPage, Result, Toast, etc.
│   └── Forms/           # VotingForm
├── Context/             # pollReducer + useRoomData (Firestore listener)
├── Firebase/            # config.js + dbHandler.js (CRUD + transactions)
└── Utils/               # Constants (messages, reducer actions)
tests/
├── helpers/             # Shared test utilities (render helpers)
├── homeFlow.test.jsx    # Create room, join room, toast flows
├── pollPage.test.jsx    # PollPage states + voting flow
├── createPoll.test.jsx  # CreatePoll, estimation, voting poll creation
├── resultPage.test.jsx  # Result page + close poll flow
├── ui.test.jsx          # NoPoll, NavBar, Footer, SideBar, 404 visuals
├── integration.test.jsx # Full lifecycle, data flow, reducer transitions
├── pollReducer.test.jsx # Pure reducer unit tests
├── useRoomData.test.jsx # Context provider + onSnapshot tests
└── dbHandler.test.js    # Firebase CRUD unit tests (mocked)
```

---

## Core Logic

### `useRoomData` — Firestore Listener Hook

Subscribes to room document changes and dispatches state updates:

```js
onSnapshot(doc(db, 'rooms', roomId), (snapshot) => {
  dispatch({ type: SUCCESS, payload: snapshot.data() })
})
```

### `castVote` — Transactional Voting

Atomically increments vote count and records the voter:

```js
await runTransaction(db, async (transaction) => {
  const roomDoc = await transaction.get(roomRef)
  const voters = roomDoc.data().poll.voted
  if (voters.some(v => v.id === userId)) throw Error('Already voted')
  options[index].votes += 1
  transaction.update(roomRef, { 'poll.options': options, 'poll.voted': [...voters, { id, displayName }] })
})
```

### `pollReducer` — State Machine

Manages poll lifecycle: `SUCCESS` (server sync), `VOTED` (optimistic), `POLL_CREATED` (reset), `LOADING`, `FAILURE`.

### Error Handling — Consistent `{response}` / `{error}` Pattern

All `dbHandler` functions return `{ response }` on success or `{ error }` on failure — no exceptions to catch. Callers check the result:

```js
const { error } = await closePoll(roomId)
if (error) { /* handle */ } else { /* proceed */ }
```

---

## Setup & Run Locally

```bash
npm install
npm run dev     # Starts Vite dev server at localhost:5173
```

### Run Tests

```bash
npm test            # Run all tests with coverage
npm run test:watch  # Watch mode
```

### Lint & Format

```bash
npm run lint        # ESLint (includes react-hooks rules)
npm run format      # Prettier
```

### Deploy

```bash
npx vite build && npx firebase deploy --only hosting --project poll-zone
```

---
