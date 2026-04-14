import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, ClipboardList, FileText, User, Edit2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const statusOptions = ['aktiv', 'geplant', 'abgeschlossen', 'pausiert']
const statusColors = { aktiv: 'badge-green', geplant: 'badge-blue', abgeschlossen: 'badge-orange', pausiert: 'badge-yellow' }
const priorityColors = { hoch: 'badge-red', mittel: 'badge-yellow', niedrig: 'badge-blue' }

export default function SiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)
  const today = new Date().toISOString().split('T')[0]

  const [site, setSite] = useState(null)
  const [heuteEinsatz, setHeuteEinsatz] = useState([])
  const [offeneAufgaben, setOffeneAufgaben] = useState([])
  const [letzteberichte, setLetzteberichte] = useState([])
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: s }, { data: einsatz }, { data: aufgaben }, { data: berichte }] = await Promise.all([
      supabase.from('baustellen').select('*').eq('id', id).single(),
      supabase.from('einsatzplanung').select('*, mitarbeiter:profiles(vorname, nachname)').eq('baustelle_id', id).eq('datum', today),
      supabase.from('aufgaben').select('id, titel, prioritaet, status, faellig_am').eq('baustelle_id', id).neq('status', 'erledigt').order('prioritaet').limit(5),
      supabase.from('tagesberichte').select('id, datum, wetter, ausgefuehrte_arbeiten, ersteller:profiles(vorname, nachname)').eq('baustelle_id', id).order('datum', { ascending: false }).limit(3),
    ])
    setSite(s)
    setForm(s || {})
    setHeuteEinsatz(einsatz ?? [])
    setOffeneAufgaben(aufgaben ?? [])
    setLetzteberichte(berichte ?? [])
  }

  async function save() {
    setSaving(true)
    await supabase.from('baustellen').update(form).eq('id', id)
    setSaving(false)
    setShowEdit(false)
    load()
  }

  if (!site) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Laden...</div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <button onClick={() => navigate('/baustellen')} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
          padding: '8px 0', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem',
        }}>
          <ArrowLeft size={16} /> Alle Baustellen
        </button>
      </div>

      <div className="page-header" style={{ alignItems: 'flex-start', marginTop: 0 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 6 }}>{site.name}</h2>
          <span className={`badge ${statusColors[site.status] ?? 'badge-blue'}`}>{site.status}</span>
        </div>
        {isChef && (
          <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowEdit(true)}>
            <Edit2 size={14} /> Bearbeiten
          </button>
        )}
      </div>

      {/* Infos */}
      <div className="card">
        {site.adresse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem' }}>
            <MapPin size={15} color="var(--text-muted)" />
            <span>{site.adresse}</span>
          </div>
        )}
        {site.auftraggeber && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Auftraggeber: <span style={{ color: 'var(--text)' }}>{site.auftraggeber}</span>
          </div>
        )}
        {site.ansprechpartner_telefon && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginBottom: 4 }}>
            <Phone size={13} color="var(--text-muted)" />
            <a href={`tel:${site.ansprechpartner_telefon}`} style={{ color: 'var(--orange)' }}>{site.ansprechpartner_telefon}</a>
          </div>
        )}
        {site.notizen && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--orange)' }}>
            {site.notizen}
          </div>
        )}
      </div>

      {/* Heute im Einsatz */}
      <div className="section-title">Heute im Einsatz</div>
      <div className="card">
        {heuteEinsatz.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 12 }}>
            Heute niemand eingeplant
          </div>
        ) : (
          heuteEinsatz.map(e => (
            <div key={e.id} className="list-item">
              <div className="list-item-icon"><User size={18} /></div>
              <div className="list-item-text">
                <div className="list-item-title">{e.mitarbeiter?.vorname} {e.mitarbeiter?.nachname}</div>
                {e.notiz && <div className="list-item-sub">{e.notiz}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Offene Aufgaben */}
      {offeneAufgaben.length > 0 && (
        <>
          <div className="section-title">Offene Aufgaben ({offeneAufgaben.length})</div>
          <div className="card">
            {offeneAufgaben.map(a => (
              <div key={a.id} className="list-item" onClick={() => navigate('/aufgaben')} style={{ cursor: 'pointer' }}>
                <div className="list-item-icon"><ClipboardList size={18} /></div>
                <div className="list-item-text">
                  <div className="list-item-title">{a.titel}</div>
                  {a.faellig_am && (
                    <div className="list-item-sub">
                      Fällig: {new Date(a.faellig_am + 'T12:00:00').toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>
                <span className={`badge ${priorityColors[a.prioritaet]}`}>{a.prioritaet}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Letzte Berichte */}
      {letzteberichte.length > 0 && (
        <>
          <div className="section-title">Letzte Berichte</div>
          <div className="card">
            {letzteberichte.map(b => (
              <div key={b.id} className="list-item" onClick={() => navigate('/tagesberichte')} style={{ cursor: 'pointer' }}>
                <div className="list-item-icon"><FileText size={18} /></div>
                <div className="list-item-text">
                  <div className="list-item-title">
                    {new Date(b.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="list-item-sub">
                    {b.ersteller?.vorname} {b.ersteller?.nachname} · {b.wetter}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Baustelle bearbeiten</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowEdit(false)}><X size={16} /></button>
            </div>
            {[['name','Name *','text'], ['adresse','Adresse','text'], ['auftraggeber','Auftraggeber','text'], ['ansprechpartner_telefon','Telefon','tel']].map(([key, label, type]) => (
              <div className="input-group" key={key}>
                <label className="input-label">{label}</label>
                <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="input-group">
              <label className="input-label">Status</label>
              <select value={form.status || 'aktiv'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Notizen</label>
              <textarea value={form.notizen || ''} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
