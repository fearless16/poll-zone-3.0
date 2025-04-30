import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
let firebaseConfig
// if (process.env.NODE_ENV === 'test') {
//   firebaseConfig = {
//     projectId: 'vote-test', // 👈 Required for emulator!
//     apiKey: 'fake-api-key', // 👈 Dummy data
//     authDomain: 'localhost',
//   }
// }

firebaseConfig = {
  apiKey: import.meta.env.VITE_REACT_APP_API_KEY,
  authDomain: import.meta.env.VITE_REACT_APP_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_REACT_APP_PROJECT_ID,
  storageBucket: import.meta.env.VITE_REACT_APP_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_REACT_APP_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_REACT_APP_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// if (process.env.NODE_ENV === 'test') {
//   connectFirestoreEmulator(db, '127.0.0.1', 8088)
// }

export { db }
