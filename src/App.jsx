import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sites from './pages/Sites'
import TimeTracking from './pages/TimeTracking'
import DailyReports from './pages/DailyReports'
import Planning from './pages/Planning'
import Tasks from './pages/Tasks'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span>Laden...</span></div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="baustellen" element={<Sites />} />
        <Route path="zeiterfassung" element={<TimeTracking />} />
        <Route path="tagesberichte" element={<DailyReports />} />
        <Route path="planung" element={<Planning />} />
        <Route path="aufgaben" element={<Tasks />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
