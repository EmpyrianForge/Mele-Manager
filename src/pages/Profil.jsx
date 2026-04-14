import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, LogOut, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToPush, unsubscribeFromPush, getPushPermission, isPushSupported } from '../lib/pushNotifications'

const rolleLabel = { chef: 'Chef / Inhaber', bauleiter: 'Bauleiter', polier: 'Polier', arbeiter: 'Arbeiter' }

export default function Profil() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [pushStatus, setPushStatus] = useState('loading')
  const [pushSupported, setPushSupported] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    isPushSupported().then(supported => {
      setPushSupported(supported)
      if (supported) getPushPermission().then(setPushStatus)
      else setPushStatus('unsupported')
    })
  }, [])

  async function togglePush() {
    setToggling(true)
    if (pushStatus === 'granted') {
      await unsubscribeFromPush(user.id)
      setPushStatus('default')
    } else {
      const ok = await subscribeToPush(user.id)
      setPushStatus(ok ? 'granted' : 'denied')
    }
    setToggling(false)
  }

  return (
    <div>
      <div className="page-header"><h2>Mein Profil</h2></div>

      {/* Nutzer-Info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={28} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {profile?.vorname} {profile?.nachname}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {rolleLabel[profile?.rolle] || profile?.rolle}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="card">
        <div className="card-title">Benachrichtigungen</div>
        {!pushSupported ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Push-Benachrichtigungen werden auf diesem Gerät nicht unterstützt.
          </p>
        ) : pushStatus === 'denied' ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--red)' }}>
            Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.
          </p>
        ) : (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              {pushStatus === 'granted'
                ? 'Du bekommst eine Meldung wenn du eingeplant wirst.'
                : 'Aktiviere Benachrichtigungen um informiert zu werden wenn du eingeplant wirst.'}
            </p>
            <button
              className={`btn ${pushStatus === 'granted' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={togglePush}
              disabled={toggling}
            >
              {pushStatus === 'granted' ? <BellOff size={18} /> : <Bell size={18} />}
              {toggling ? 'Wird gesetzt...' : pushStatus === 'granted' ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
            </button>
          </div>
        )}
      </div>

      {/* App-Info */}
      <div className="card">
        <div className="card-title">App</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>MeLe Baustellenmanager</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Version 1.0.0</div>
      </div>

      {/* Abmelden */}
      <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={async () => { await signOut(); navigate('/login') }}>
        <LogOut size={18} /> Abmelden
      </button>
    </div>
  )
}
