import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './components/Home'
import Studio from './components/Studio'
import LiveChat from './components/LiveChat'
import DualStream from './components/DualStream'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/chat/:roomId" element={<LiveChat />} />
          <Route path="/studio/:roomId" element={<DualStream />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

