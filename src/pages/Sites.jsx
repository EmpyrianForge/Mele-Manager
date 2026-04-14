import { useEffect, useState } from 'react'
import { HardHat, Plus, MapPin, Phone, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const statusOptions = ['aktiv', 'geplant', 'abgeschlossen', 'pausiert']
const statusColors = { aktiv: 'badge-green', geplant: 'badge-blue', abgeschlossen: 'badge-orange', pausiert: 'badge-yellow' }

const emptyForm = { name: '', adresse: '', auftraggeber: '', ansprechpartner_telefon: '', status: 'aktiv', notizen: '' }

export default function Sites() {
  const [sites, setSites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('baustellen').select('*').order('created_at', { ascending: false })
    setSites(data ?? [])
  }

  async function save() {
    setSaving(true)
    if (form.id) {
      await supabase.from('baustellen').update(form).eq('id', form.id)
    } else {
      await supabase.from('baustellen').insert(form)
    }
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    load()
  }

  function edit(site) {
    setForm(site)
    setShowForm(true)
    setSelected(null)
  }

  return (
    <div>
      <div className="page-header">
        <h2>Baustellen</h2>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => { setForm(emptyForm); setShowForm(true) }}>
          <Plus size={16} /> Neu
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="card"><div className="empty-state"><HardHat /><p>Noch keine Baustellen angelegt</p></div></div>
      ) : (
        sites.map(site => (
          <div key={site.id} className="card" onClick={() => setSelected(site)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{site.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {site.adresse}
                </div>
                {site.auftraggeber && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>{site.auftraggeber}</div>
                )}
              </div>
              <span className={`badge ${statusColors[site.status] ?? 'badge-blue'}`}>{site.status}</span>
            </div>
          </div>
        ))
      )}

      {/* Detail-Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{selected.name}</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}><MapPin size={13} style={{ display: 'inline' }} /> {selected.adresse}</p>
            {selected.auftraggeber && <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>Auftraggeber: {selected.auftraggeber}</p>}
            {selected.ansprechpartner_telefon && (
              <p style={{ fontSize: '0.85rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={13} />
                <a href={`tel:${selected.ansprechpartner_telefon}`} style={{ color: 'var(--orange)' }}>{selected.ansprechpartner_telefon}</a>
              </p>
            )}
            {selected.notizen && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>{selected.notizen}</p>}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => edit(selected)}>Bearbeiten</button>
            </div>
          </div>
        </div>
      )}

      {/* Formular-Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{form.id ? 'Baustelle bearbeiten' : 'Neue Baustelle'}</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            {[
              ['name', 'Name *', 'text', 'z.B. B14 Kreuzung Mitte'],
              ['adresse', 'Adresse', 'text', 'Straße, PLZ Ort'],
              ['auftraggeber', 'Auftraggeber', 'text', 'Firma / Amt'],
              ['ansprechpartner_telefon', 'Telefon', 'tel', '+49 ...'],
            ].map(([key, label, type, placeholder]) => (
              <div className="input-group" key={key}>
                <label className="input-label">{label}</label>
                <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="input-group">
              <label className="input-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Notizen</label>
              <textarea placeholder="Besonderheiten, Zufahrt, ..." value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
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
