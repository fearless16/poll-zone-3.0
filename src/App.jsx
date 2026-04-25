import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router'
import PollPage from './Components/PollPage'
import Result from './Components/Result'
import Home from './Components/Home'
import CreatePoll from './Components/CreatePoll'
import PageNotFound from './Components/404'
import { RoomDataContextProvider } from './Context/useRoomData'
import NavigationBar from './Components/NavBar'
import Footer from './Components/Footer'

function App() {
  return (
    <div className="App d-flex flex-column min-vh-100">
      <RoomDataContextProvider>
        <Router>
          <NavigationBar />
          <main className="flex-grow-1 h-100">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreatePoll />} />
              <Route path="/poll" element={<PollPage />} />
              <Route path="/result" element={<Result />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </main>
          <Footer />
        </Router>
      </RoomDataContextProvider>
    </div>
  )
}

export default App
