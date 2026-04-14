import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react'
import { queueCount, syncQueue } from '../lib/offlineQueue'

export default function OfflineBar() {
  const [online, setOnline]     = useState(navigator.onLine)
  const [pending, setPending]   = useState(queueCount())
  const [syncing, setSyncing]   = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  useEffect(() => {
    const goOnline = async () => {
      setOnline(true)
      const count = queueCount()
      if (count > 0) {
        setSyncing(true)
        await syncQueue()
        setPending(0)
        setSyncing(false)
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 3000)
      }
    }
    const goOffline = () => { setOnline(false); setPending(queueCount()) }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  if (online && !justSynced && pending === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      padding: '8px 16px',
      background: justSynced ? 'var(--green)' : online ? 'var(--yellow)' : 'var(--red)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600,
      color: 'white', justifyContent: 'center',
    }}>
      {justSynced ? (
        <><CheckCircle size={16} /> Daten synchronisiert</>
      ) : syncing ? (
        <><RefreshCw size={16} className="spin" /> Wird synchronisiert...</>
      ) : !online ? (
        <><WifiOff size={16} /> Offline – Einträge werden gespeichert {pending > 0 ? `(${pending} ausstehend)` : ''}</>
      ) : (
        <><RefreshCw size={16} /> {pending} Einträge werden synchronisiert...</>
      )}
    </div>
  )
}
