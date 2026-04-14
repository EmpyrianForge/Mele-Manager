import { useEffect, useState } from 'react'
import { CalendarDays, Plus, X, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1 + offset * 7)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const emptyForm = { datum: '', mitarbeiter_id: '', baustelle_id: '', notiz: '' }

export default function Planning() {
  const { profile } = useAuth()
  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)
  const [weekOffset, setWeekOffset] = useState(0)
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [sites, setSites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(weekOffset)

  useEffect(() => {
    supabase.from('profiles').select('id, vorname, nachname').then(({ data }) => setEmployees(data ?? []))
    supabase.from('baustellen').select('id, name').eq('status', 'aktiv').then(({ data }) => setSites(data ?? []))
  }, [])

  useEffect(() => { load() }, [weekOffset])

  async function load() {
    const { data } = await supabase
      .from('einsatzplanung')
      .select('*, mitarbeiter:profiles(vorname, nachname), baustelle:baustellen(name)')
      .gte('datum', weekDates[0])
      .lte('datum', weekDates[5])
    setAssignments(data ?? [])
  }

  async function save() {
    setSaving(true)
    await supabase.from('einsatzplanung').insert(form)
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    load()
  }

  async function remove(id) {
    await supabase.from('einsatzplanung').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h2>Einsatzplanung</h2>
        {isChef && (
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(true)}>
            <Plus size={16} /> Planen
          </button>
        )}
      </div>

      {/* Wochennavigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setWeekOffset(o => o - 1)}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {new Date(weekDates[0] + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} –{' '}
          {new Date(weekDates[5] + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setWeekOffset(o => o + 1)}>›</button>
      </div>

      {/* Wochenraster */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 20 }}>
        {weekDates.map((date, i) => {
          const dayAssignments = assignments.filter(a => a.datum === date)
          const isToday = date === new Date().toISOString().split('T')[0]
          return (
            <div key={date} style={{
              background: 'var(--bg-card)',
              borderRadius: 8,
              padding: '8px 6px',
              border: isToday ? '1px solid var(--orange)' : '1px solid var(--border)',
              minHeight: 80,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isToday ? 'var(--orange)' : 'var(--text-muted)', marginBottom: 4, textAlign: 'center' }}>
                {weekdays[i]}<br />
                <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                  {new Date(date + 'T12:00:00').getDate()}
                </span>
              </div>
              {dayAssignments.map(a => (
                <div key={a.id} style={{ background: 'var(--bg-input)', borderRadius: 4, padding: '3px 5px', marginBottom: 3, fontSize: '0.65rem', color: 'var(--text)' }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {a.mitarbeiter?.vorname}
                  </div>
                  <div style={{ color: 'var(--orange)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {a.baustelle?.name}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Listenansicht */}
      <div className="section-title">Alle Einplanungen dieser Woche</div>
      <div className="card">
        {assignments.length === 0 ? (
          <div className="empty-state"><CalendarDays /><p>Keine Einplanungen diese Woche</p></div>
        ) : (
          assignments.map(a => (
            <div key={a.id} className="list-item">
              <div className="list-item-icon"><User size={18} /></div>
              <div className="list-item-text">
                <div className="list-item-title">{a.mitarbeiter?.vorname} {a.mitarbeiter?.nachname}</div>
                <div className="list-item-sub">
                  {new Date(a.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })} · {a.baustelle?.name}
                </div>
              </div>
              {isChef && (
                <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }} onClick={() => remove(a.id)}>
                  <X size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Mitarbeiter einplanen</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            <div className="input-group">
              <label className="input-label">Datum</label>
              <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Mitarbeiter</label>
              <select value={form.mitarbeiter_id} onChange={e => setForm(f => ({ ...f, mitarbeiter_id: e.target.value }))}>
                <option value="">-- Auswählen --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.vorname} {e.nachname}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Baustelle</label>
              <select value={form.baustelle_id} onChange={e => setForm(f => ({ ...f, baustelle_id: e.target.value }))}>
                <option value="">-- Auswählen --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Notiz</label>
              <input type="text" placeholder="Optional..." value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.datum || !form.mitarbeiter_id || !form.baustelle_id}>
              {saving ? 'Speichern...' : 'Einplanen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
