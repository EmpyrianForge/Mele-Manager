import { useEffect, useState } from 'react'
import { FileText, Plus, X, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import { exportTagesberichtPDF } from '../lib/pdfExport'

const weatherOptions = ['Sonnig', 'Bewölkt', 'Leichter Regen', 'Starkregen', 'Schnee', 'Frost', 'Sturm']

const emptyForm = {
  datum: new Date().toISOString().split('T')[0],
  baustelle_id: '',
  wetter: 'Sonnig',
  temperatur: '',
  ausgefuehrte_arbeiten: '',
  vorkommnisse: '',
  verzoegerungen: '',
  personal_anzahl: '',
  geraete: '',
  foto_urls: [],
}

export default function DailyReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [sites, setSites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
    supabase.from('baustellen').select('id, name').then(({ data }) => setSites(data ?? []))
  }, [])

  async function load() {
    const { data } = await supabase
      .from('tagesberichte')
      .select('*, baustelle:baustellen(name)')
      .order('datum', { ascending: false })
      .limit(20)
    setReports(data ?? [])
  }

  async function save() {
    setSaving(true)
    await supabase.from('tagesberichte').insert({ ...form, erstellt_von: user.id })
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    load()
  }

  const f = (key, label, type = 'text', placeholder = '') => (
    <div className="input-group" key={key}>
      <label className="input-label">{label}</label>
      {type === 'textarea' ? (
        <textarea placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      ) : (
        <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      )}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h2>Tagesberichte</h2>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => { setForm(emptyForm); setShowForm(true) }}>
          <Plus size={16} /> Neu
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card"><div className="empty-state"><FileText /><p>Noch keine Berichte</p></div></div>
      ) : (
        reports.map(r => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.baustelle?.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(r.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-blue">{r.wetter}</span>
                <button className="btn btn-secondary btn-sm" style={{ width: 'auto', padding: '4px 8px' }}
                  onClick={() => exportTagesberichtPDF(r.id)}>
                  <Download size={14} />
                </button>
              </div>
            </div>
            {r.ausgefuehrte_arbeiten && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }} >
                {r.ausgefuehrte_arbeiten.slice(0, 100)}{r.ausgefuehrte_arbeiten.length > 100 ? '…' : ''}
              </p>
            )}
            {r.vorkommnisse && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--yellow)' }}>
                Vorkommnis: {r.vorkommnisse}
              </div>
            )}
            {r.foto_urls?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {r.foto_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto ${i+1}`}
                    onClick={() => window.open(url, '_blank')}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Tagesbericht</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>

            {f('datum', 'Datum', 'date')}
            <div className="input-group">
              <label className="input-label">Baustelle</label>
              <select value={form.baustelle_id} onChange={e => setForm(f => ({ ...f, baustelle_id: e.target.value }))}>
                <option value="">-- Auswählen --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Wetter</label>
                <select value={form.wetter} onChange={e => setForm(f => ({ ...f, wetter: e.target.value }))}>
                  {weatherOptions.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              {f('temperatur', 'Temp. (°C)', 'number')}
            </div>
            {f('personal_anzahl', 'Anzahl Personal', 'number', 'z.B. 8')}
            {f('geraete', 'Geräte / Fahrzeuge', 'text', 'z.B. Bagger, LKW...')}
            {f('ausgefuehrte_arbeiten', 'Ausgeführte Arbeiten *', 'textarea', 'Was wurde heute gemacht?')}
            {f('vorkommnisse', 'Vorkommnisse / Mängel', 'textarea', 'Unfälle, Probleme, Beschwerden...')}
            {f('verzoegerungen', 'Verzögerungen', 'textarea', 'Ursachen für Verzögerungen...')}

            <div className="input-group">
              <label className="input-label">Fotos</label>
              <PhotoUpload
                folder={`berichte/${form.datum}-${form.baustelle_id || 'neu'}`}
                existingUrls={form.foto_urls}
                onUploaded={url => setForm(f => ({ ...f, foto_urls: [...f.foto_urls, url] }))}
                onRemove={url => setForm(f => ({ ...f, foto_urls: f.foto_urls.filter(u => u !== url) }))}
              />
            </div>

            <button className="btn btn-primary" onClick={save} disabled={saving || !form.baustelle_id || !form.ausgefuehrte_arbeiten}>
              {saving ? 'Speichern...' : 'Bericht speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
