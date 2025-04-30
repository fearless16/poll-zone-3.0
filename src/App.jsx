import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PollPage from './Components/PollPage'
import Result from './Components/Result'
import Home from './Components/Home'
import CreatePoll from './Components/CreatePoll'
import PageNotFound from './Components/404'
import { RoomDataContextProvider } from './Context/useRoomData'

function App() {
  return (
    <div className="App">
      <RoomDataContextProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/poll" element={<PollPage />} />
            <Route path="/result" element={<Result />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
      </RoomDataContextProvider>
    </div>
  )
}

export default App
