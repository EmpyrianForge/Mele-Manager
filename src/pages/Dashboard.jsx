import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardHat, ClipboardList, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ baustellen: 0, offeneAufgaben: 0, fehlendeBerichteHeute: 0, aktiveMitarbeiter: 0 })
  const [recentSites, setRecentSites] = useState([])
  const [openTasks, setOpenTasks] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]

    const [{ count: baustellenCount }, { count: aufgabenCount }, { data: sites }, { data: tasks }] = await Promise.all([
      supabase.from('baustellen').select('*', { count: 'exact', head: true }).eq('status', 'aktiv'),
      supabase.from('aufgaben').select('*', { count: 'exact', head: true }).eq('status', 'offen'),
      supabase.from('baustellen').select('id, name, adresse, status').eq('status', 'aktiv').limit(3),
      supabase.from('aufgaben').select('id, titel, prioritaet, baustelle:baustellen(name)').eq('status', 'offen').order('prioritaet').limit(4),
    ])

    setStats(s => ({ ...s, baustellen: baustellenCount ?? 0, offeneAufgaben: aufgabenCount ?? 0 }))
    setRecentSites(sites ?? [])
    setOpenTasks(tasks ?? [])
  }

  const priorityColor = { hoch: 'badge-red', mittel: 'badge-yellow', niedrig: 'badge-blue' }

  return (
    <div>
      <div className="page-header">
        <h2>Guten Tag{profile ? `, ${profile.vorname}` : ''}!</h2>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.baustellen}</div>
          <div className="stat-label">Aktive Baustellen</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: stats.offeneAufgaben > 0 ? 'var(--red)' : 'var(--green)' }}>
            {stats.offeneAufgaben}
          </div>
          <div className="stat-label">Offene Aufgaben</div>
        </div>
      </div>

      {/* Aktive Baustellen */}
      <div className="section-title">Aktive Baustellen</div>
      <div className="card">
        {recentSites.length === 0 ? (
          <div className="empty-state"><HardHat /><p>Keine aktiven Baustellen</p></div>
        ) : (
          recentSites.map(site => (
            <div key={site.id} className="list-item" onClick={() => navigate('/baustellen')}>
              <div className="list-item-icon"><HardHat size={20} /></div>
              <div className="list-item-text">
                <div className="list-item-title">{site.name}</div>
                <div className="list-item-sub">{site.adresse}</div>
              </div>
              <span className="badge badge-green">{site.status}</span>
            </div>
          ))
        )}
      </div>

      {/* Offene Aufgaben */}
      <div className="section-title">Dringende Aufgaben</div>
      <div className="card">
        {openTasks.length === 0 ? (
          <div className="empty-state"><ClipboardList /><p>Keine offenen Aufgaben</p></div>
        ) : (
          openTasks.map(task => (
            <div key={task.id} className="list-item" onClick={() => navigate('/aufgaben')}>
              <div className="list-item-icon"><AlertTriangle size={20} /></div>
              <div className="list-item-text">
                <div className="list-item-title">{task.titel}</div>
                <div className="list-item-sub">{task.baustelle?.name}</div>
              </div>
              <span className={`badge ${priorityColor[task.prioritaet] ?? 'badge-blue'}`}>{task.prioritaet}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
