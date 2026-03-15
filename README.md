# 🗳️ Poll Zone (Realtime voting system)

A lightning-fast, race-condition-proof voting system built using **React**, **Firebase Firestore**, and **transactional vote casting**. Handles real-time updates, prevents double voting, and survives concurrency like a boss.

---

## 🚀 Features

- 🔥 **Realtime poll updates** via Firestore listeners
- 🔒 **Secure vote casting** using Firestore `runTransaction()`
- 🛡️ **Double voting prevention**
- 🧠 **Optionally anonymous or named voting**
- 📊 **Poll creation + result viewing**
- 🧪 **Fully testable with Firebase Emulator**
- 🧼 Optimized React hooks (`useReducer`, `useEffect`) with state guards

---

## 🧱 Tech Stack

| Tech              | Usage                    |
| ----------------- | ------------------------ |
| React             | Frontend (18+)           |
| Firebase          | Firestore DB             |
| Firestore         | Real-time sync + storage |
| Vite              | Fast dev + build tooling |
| Jest              | Unit + emulator testing  |
| Firebase Emulator | Local test infra         |

---

## 📦 Folder Structure

```
.
├── src/
│   ├── Components/          # UI Components
│   ├── Context/             # Room & Poll State (useRoomData, reducer)
│   ├── Firebase/            # DB config & dbHandler (castVote, etc.)
│   ├── Forms/               # Voting Form logic
│   └── Utils/               # Constants etc.
├── tests/                   # Firebase Emulator-based tests
├── public/
├── firebase.json            # Emulator config
└── README.md
```

---

## 🧠 Core Logic Overview

### 🔄 `useRoomData` (React Hook)

Attaches Firestore snapshot listener:

```js
onSnapshot(doc(db, 'rooms', roomId), (snapshot) => {
  if (!snapshot.metadata.hasPendingWrites) {
    dispatch({ type: SUCCESS, payload })
  }
})
```

---

### 🔐 `castVote` (Transactional Voting)

```js
await runTransaction(db, async (transaction) => {
  const roomDoc = await transaction.get(roomRef)
  if (voters.includes(userId)) throw Error("Already voted!")
  options[optionIndex].votes += 1
  transaction.update(roomRef, { 'poll.options': options, ... })
})
```

---

## 🧪 Run Emulator Tests

1. Start Firestore Emulator:

```bash
npm run emulators
```

2. Run tests:

```bash
npm run test
```

---

## 🛠️ Firebase Emulator Config (firebase.json)

```json
{
  "emulators": {
    "firestore": { "port": 8080 }
  }
}
```

---

## 🏗️ Setup & Run Locally

```bash
npm install
npm run dev
```

---

## 🧯 Warning

- Firestore rules not enforced in local emulator (bypass security)
- All voting logic is transactional but still needs `auth` protection for prod

---
