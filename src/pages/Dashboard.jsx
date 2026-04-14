import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardHat, ClipboardList, AlertTriangle, MapPin, Clock, CheckCircle2, X, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { queueInsert } from '../lib/offlineQueue'

const taetigkeiten = ['Asphalteinbau', 'Erdarbeiten', 'Pflasterarbeiten', 'Markierungsarbeiten', 'Bordsteinarbeiten', 'Kanalbau', 'Aufräumen', 'Sonstiges']

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)
  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  // Chef state
  const [stats, setStats] = useState({ baustellen: 0, offeneAufgaben: 0 })
  const [recentSites, setRecentSites] = useState([])
  const [openTasks, setOpenTasks] = useState([])
  const [heuteEinsatz, setHeuteEinsatz] = useState([])

  // Arbeiter state
  const [meinEinsatz, setMeinEinsatz] = useState(null)
  const [bereitsEingestempelt, setBereitsEingestempelt] = useState(false)
  const [meineAufgaben, setMeineAufgaben] = useState([])

  // Schnell-Einstempel
  const [showEinstempel, setShowEinstempel] = useState(false)
  const [einstempelForm, setEinstempelForm] = useState({ von: '07:00', bis: '16:00', pause_min: 30, taetigkeit: 'Asphalteinbau', baustelle_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    if (isChef) loadChefDashboard()
    else loadArbeiterDashboard()
  }, [profile])

  async function loadChefDashboard() {
    const [{ count: baustellenCount }, { count: aufgabenCount }, { data: sites }, { data: tasks }, { data: einsatz }] = await Promise.all([
      supabase.from('baustellen').select('*', { count: 'exact', head: true }).eq('status', 'aktiv'),
      supabase.from('aufgaben').select('*', { count: 'exact', head: true }).eq('status', 'offen'),
      supabase.from('baustellen').select('id, name, adresse, status').eq('status', 'aktiv').limit(3),
      supabase.from('aufgaben').select('id, titel, prioritaet, baustelle:baustellen(name)').eq('status', 'offen').order('prioritaet').limit(4),
      supabase.from('einsatzplanung').select('*, mitarbeiter:profiles(vorname, nachname), baustelle:baustellen(name)').eq('datum', today),
    ])
    setStats({ baustellen: baustellenCount ?? 0, offeneAufgaben: aufgabenCount ?? 0 })
    setRecentSites(sites ?? [])
    setOpenTasks(tasks ?? [])
    setHeuteEinsatz(einsatz ?? [])
  }

  async function loadArbeiterDashboard() {
    if (!user) return
    const [einsatzRes, checkinRes, tasksRes] = await Promise.all([
      supabase.from('einsatzplanung').select('*, baustelle:baustellen(id, name, adresse)').eq('mitarbeiter_id', user.id).eq('datum', today).maybeSingle(),
      supabase.from('zeiterfassung').select('id').eq('mitarbeiter_id', user.id).eq('datum', today).limit(1),
      supabase.from('aufgaben').select('id, titel, prioritaet, baustelle:baustellen(name)').neq('status', 'erledigt').limit(4),
    ])
    const einsatz = einsatzRes.data
    setMeinEinsatz(einsatz || null)
    setBereitsEingestempelt((checkinRes.data?.length ?? 0) > 0)
    setMeineAufgaben(tasksRes.data ?? [])
    if (einsatz?.baustelle?.id) {
      setEinstempelForm(f => ({ ...f, baustelle_id: einsatz.baustelle.id }))
    }
  }

  function calcHours(von, bis, pause) {
    const [vh, vm] = von.split(':').map(Number)
    const [bh, bm] = bis.split(':').map(Number)
    return Math.max(0, ((bh * 60 + bm) - (vh * 60 + vm) - Number(pause)) / 60).toFixed(1)
  }

  async function einstempeln() {
    setSaving(true)
    const eintrag = { ...einstempelForm, mitarbeiter_id: user.id, datum: today, stunden: calcHours(einstempelForm.von, einstempelForm.bis, einstempelForm.pause_min) }
    if (!navigator.onLine) queueInsert('zeiterfassung', eintrag)
    else await supabase.from('zeiterfassung').insert(eintrag)
    setSaving(false)
    setShowEinstempel(false)
    setBereitsEingestempelt(true)
  }

  const priorityColor = { hoch: 'badge-red', mittel: 'badge-yellow', niedrig: 'badge-blue' }

  // ── ARBEITER VIEW ──────────────────────────────────────────────
  if (!isChef) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Guten Tag, {profile?.vorname}!</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{todayLabel}</div>
          </div>
        </div>

        <div className="section-title">Mein heutiger Einsatz</div>
        {meinEinsatz ? (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--orange)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <HardHat size={22} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>{meinEinsatz.baustelle?.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {meinEinsatz.baustelle?.adresse}
                </div>
                {meinEinsatz.notiz && (
                  <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--yellow)', fontStyle: 'italic' }}>
                    Hinweis: {meinEinsatz.notiz}
                  </div>
                )}
              </div>
            </div>

            {bereitsEingestempelt ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(34,197,94,0.12)', borderRadius: 8, color: 'var(--green)', fontWeight: 600 }}>
                <CheckCircle2 size={20} /> Heute bereits eingestempelt
              </div>
            ) : (
              <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px' }} onClick={() => setShowEinstempel(true)}>
                <Clock size={20} /> Jetzt einstempeln
              </button>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state" style={{ padding: 24 }}>
              <HardHat />
              <p>Für heute kein Einsatz geplant</p>
            </div>
          </div>
        )}

        {meineAufgaben.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 8 }}>Offene Aufgaben</div>
            <div className="card">
              {meineAufgaben.map(task => (
                <div key={task.id} className="list-item" onClick={() => navigate('/aufgaben')} style={{ cursor: 'pointer' }}>
                  <div className="list-item-icon"><AlertTriangle size={18} /></div>
                  <div className="list-item-text">
                    <div className="list-item-title">{task.titel}</div>
                    <div className="list-item-sub">{task.baustelle?.name}</div>
                  </div>
                  <span className={`badge ${priorityColor[task.prioritaet] ?? 'badge-blue'}`}>{task.prioritaet}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {showEinstempel && (
          <div className="modal-overlay" onClick={() => setShowEinstempel(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3>Einstempeln</h3>
                <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowEinstempel(false)}><X size={16} /></button>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16, fontWeight: 600, fontSize: '0.95rem' }}>
                {meinEinsatz?.baustelle?.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Von</label>
                  <input type="time" value={einstempelForm.von} onChange={e => setEinstempelForm(f => ({ ...f, von: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Bis</label>
                  <input type="time" value={einstempelForm.bis} onChange={e => setEinstempelForm(f => ({ ...f, bis: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Pause (Minuten)</label>
                <input type="number" value={einstempelForm.pause_min} min={0} step={15} onChange={e => setEinstempelForm(f => ({ ...f, pause_min: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Tätigkeit</label>
                <select value={einstempelForm.taetigkeit} onChange={e => setEinstempelForm(f => ({ ...f, taetigkeit: e.target.value }))}>
                  {taetigkeiten.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', color: 'var(--orange)' }}>
                Netto: {calcHours(einstempelForm.von, einstempelForm.bis, einstempelForm.pause_min)} Stunden
              </div>
              <button className="btn btn-primary" onClick={einstempeln} disabled={saving || !einstempelForm.baustelle_id}>
                {saving ? 'Wird gespeichert...' : 'Eintragen'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── CHEF / BAULEITER / POLIER VIEW ─────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Guten Tag, {profile?.vorname}!</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{todayLabel}</div>
        </div>
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

      {heuteEinsatz.length > 0 && (
        <>
          <div className="section-title">Heute im Einsatz ({heuteEinsatz.length})</div>
          <div className="card">
            {heuteEinsatz.map(e => (
              <div key={e.id} className="list-item" onClick={() => navigate(`/baustellen/${e.baustelle_id}`)} style={{ cursor: 'pointer' }}>
                <div className="list-item-icon"><User size={18} /></div>
                <div className="list-item-text">
                  <div className="list-item-title">{e.mitarbeiter?.vorname} {e.mitarbeiter?.nachname}</div>
                  <div className="list-item-sub">{e.baustelle?.name}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Aktive Baustellen</div>
      <div className="card">
        {recentSites.length === 0 ? (
          <div className="empty-state"><HardHat /><p>Keine aktiven Baustellen</p></div>
        ) : (
          recentSites.map(site => (
            <div key={site.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => navigate(`/baustellen/${site.id}`)}>
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

      <div className="section-title">Dringende Aufgaben</div>
      <div className="card">
        {openTasks.length === 0 ? (
          <div className="empty-state"><ClipboardList /><p>Keine offenen Aufgaben</p></div>
        ) : (
          openTasks.map(task => (
            <div key={task.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/aufgaben')}>
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
