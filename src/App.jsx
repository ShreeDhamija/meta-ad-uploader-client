// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login' // import the new page
import Home from './pages/Home' // import the new page
import Settings from "./pages/Settings"


function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

export default App
