import { useEffect, useState } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { queueInsert } from '../lib/offlineQueue'

const taetigkeiten = ['Asphalteinbau', 'Erdarbeiten', 'Pflasterarbeiten', 'Markierungsarbeiten', 'Bordsteinarbeiten', 'Kanalbau', 'Aufräumen', 'Sonstiges']

export default function TimeTracking() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState([])
  const [sites, setSites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    datum: today,
    baustelle_id: '',
    von: '07:00',
    bis: '16:00',
    pause_min: 30,
    taetigkeit: 'Asphalteinbau',
    notiz: ''
  })

  useEffect(() => {
    load()
    supabase.from('baustellen').select('id, name').eq('status', 'aktiv').then(({ data }) => setSites(data ?? []))
  }, [])

  async function load() {
    const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)
    let query = supabase
      .from('zeiterfassung')
      .select('*, baustelle:baustellen(name), mitarbeiter:profiles(vorname, nachname)')
      .order('datum', { ascending: false })
      .limit(50)

    // Arbeiter sieht nur eigene Einträge
    if (!isChef) query = query.eq('mitarbeiter_id', user.id)

    const { data } = await query
    setEntries(data ?? [])
  }

  function calcHours(von, bis, pause) {
    const [vh, vm] = von.split(':').map(Number)
    const [bh, bm] = bis.split(':').map(Number)
    const total = (bh * 60 + bm) - (vh * 60 + vm) - Number(pause)
    return Math.max(0, total / 60).toFixed(1)
  }

  async function save() {
    setSaving(true)
    const eintrag = { ...form, mitarbeiter_id: user.id, stunden: calcHours(form.von, form.bis, form.pause_min) }

    if (!navigator.onLine) {
      queueInsert('zeiterfassung', eintrag)
    } else {
      await supabase.from('zeiterfassung').insert(eintrag)
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  const grouped = entries.reduce((acc, e) => {
    const d = e.datum
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})

  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)

  return (
    <div>
      <div className="page-header">
        <h2>Zeiterfassung</h2>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(true)}>
          <Plus size={16} /> Eintragen
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card"><div className="empty-state"><Clock /><p>Noch keine Einträge</p></div></div>
      ) : (
        Object.entries(grouped).map(([date, dayEntries]) => (
          <div key={date}>
            <div className="section-title">{new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            <div className="card">
              {dayEntries.map(e => (
                <div key={e.id} className="list-item">
                  <div className="list-item-icon"><Clock size={18} /></div>
                  <div className="list-item-text">
                    <div className="list-item-title">
                      {isChef && e.mitarbeiter ? `${e.mitarbeiter.vorname} ${e.mitarbeiter.nachname} · ` : ''}{e.baustelle?.name}
                    </div>
                    <div className="list-item-sub">{e.von}–{e.bis} · {e.taetigkeit}</div>
                  </div>
                  <span className="badge badge-blue">{e.stunden}h</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Zeit eintragen</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>

            <div className="input-group">
              <label className="input-label">Datum</label>
              <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Baustelle</label>
              <select value={form.baustelle_id} onChange={e => setForm(f => ({ ...f, baustelle_id: e.target.value }))}>
                <option value="">-- Auswählen --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Von</label>
                <input type="time" value={form.von} onChange={e => setForm(f => ({ ...f, von: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Bis</label>
                <input type="time" value={form.bis} onChange={e => setForm(f => ({ ...f, bis: e.target.value }))} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Pause (Minuten)</label>
              <input type="number" value={form.pause_min} min={0} step={15} onChange={e => setForm(f => ({ ...f, pause_min: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Tätigkeit</label>
              <select value={form.taetigkeit} onChange={e => setForm(f => ({ ...f, taetigkeit: e.target.value }))}>
                {taetigkeiten.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Notiz</label>
              <textarea placeholder="Optional..." value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))} />
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', color: 'var(--orange)' }}>
              Netto: {calcHours(form.von, form.bis, form.pause_min)} Stunden
            </div>

            <button className="btn btn-primary" onClick={save} disabled={saving || !form.baustelle_id}>
              {saving ? 'Speichern...' : 'Eintragen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
