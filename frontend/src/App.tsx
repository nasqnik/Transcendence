import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RTL_LANGUAGES } from './i18n/config'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ChildDashboard from './pages/ChildDashboard'
import ParentDashboard from './pages/ParentDashboard'
import CharacterCreation from './pages/CharacterCreation'
import Profile from './pages/Profile'
import ParentProfile from './pages/ParentProfile'

export default function App() {
  const { i18n } = useTranslation()
  const isRTL = RTL_LANGUAGES.includes(i18n.language)

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Child (protected) */}
          <Route path="/dashboard" element={<ChildDashboard />} />
          <Route path="/character" element={<CharacterCreation />} />
          <Route path="/profile" element={<Profile />} />

          {/* Parent (protected) */}
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/profile" element={<ParentProfile />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}
