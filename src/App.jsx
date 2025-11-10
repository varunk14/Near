import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './components/Home'
import Studio from './components/Studio'
import LiveChat from './components/LiveChat'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Link to="/" className="header-link">
            <h1>Near</h1>
            <p className="subtitle">Studio Quality Recording & Live Chat</p>
          </Link>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/chat/:roomId" element={<LiveChat />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

