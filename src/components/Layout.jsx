import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from './BottomNav'
import OfflineBar from './OfflineBar'

export default function Layout() {
  const { profile } = useAuth()

  return (
    <div className="layout">
      <OfflineBar />
      <header className="top-bar">
        <h1>MeLe</h1>
        {profile && (
          <span className="user-badge">
            {profile.vorname} · {profile.rolle}
          </span>
        )}
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
