// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Settings from "./pages/Settings"
import TermsOfService from "./pages/Landing/TermsOfService"
import PrivacyPolicy from "./pages/Landing/PrivacyPolicy"
//import Landing from "./pages/Landing"

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/* <Route path="/landing" element={<Landing />} /> */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>
    </div>
  )
}

export default App
