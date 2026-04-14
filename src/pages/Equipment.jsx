import { useEffect, useState } from 'react'
import { Wrench, Plus, X, ChevronDown, ChevronUp, Fuel, Clock, AlertTriangle, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PhotoUpload from '../components/PhotoUpload'

const geraetTypen = ['Bagger', 'Minibagger', 'Walze', 'Fertiger', 'Fräse', 'LKW', 'Radlader', 'Rüttelplatte', 'Verdichter', 'Anhänger', 'Sonstiges']

const statusConfig = {
  'verfügbar':  { color: 'var(--green)',  bg: 'rgba(34,197,94,0.12)',  label: 'Verfügbar' },
  'im Einsatz': { color: 'var(--orange)', bg: 'rgba(249,115,22,0.12)', label: 'Im Einsatz' },
  'in Wartung': { color: '#facc15',       bg: 'rgba(250,204,21,0.12)', label: 'In Wartung' },
  'defekt':     { color: 'var(--red)',    bg: 'rgba(239,68,68,0.12)',  label: 'Defekt' },
}

const emptyGeraet = { name: '', typ: 'Bagger', kennzeichen: '', seriennummer: '', status: 'verfügbar', baujahr: '', notizen: '' }
const emptyProtokoll = { datum: new Date().toISOString().split('T')[0], baustelle_id: '', fahrer_id: '', betriebsstunden: '', kraftstoff_liter: '', km_stand: '', defekte: '', bemerkungen: '', foto_urls: [] }

export default function Equipment() {
  const { user, profile } = useAuth()
  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)

  const [geraete, setGeraete] = useState([])
  const [sites, setSites] = useState([])
  const [employees, setEmployees] = useState([])
  const [filterStatus, setFilterStatus] = useState('alle')
  const [expanded, setExpanded] = useState(null) // geraet id
  const [protokolle, setProtokolle] = useState({}) // { [geraet_id]: [...] }

  const [showGeraetForm, setShowGeraetForm] = useState(false)
  const [geraetForm, setGeraetForm] = useState(emptyGeraet)
  const [savingGeraet, setSavingGeraet] = useState(false)

  const [showProtokollForm, setShowProtokollForm] = useState(null) // geraet_id
  const [protokollForm, setProtokollForm] = useState(emptyProtokoll)
  const [savingProtokoll, setSavingProtokoll] = useState(false)

  useEffect(() => {
    load()
    supabase.from('baustellen').select('id, name').eq('status', 'aktiv').then(({ data }) => setSites(data ?? []))
    supabase.from('profiles').select('id, vorname, nachname').then(({ data }) => setEmployees(data ?? []))
  }, [])

  async function load() {
    const { data } = await supabase.from('geraete').select('*').order('name')
    setGeraete(data ?? [])
  }

  async function loadProtokoll(geraetId) {
    const { data } = await supabase
      .from('maschinen_protokoll')
      .select('*, baustelle:baustellen(name), fahrer:profiles(vorname, nachname)')
      .eq('geraet_id', geraetId)
      .order('datum', { ascending: false })
      .limit(10)
    setProtokolle(p => ({ ...p, [geraetId]: data ?? [] }))
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!protokolle[id]) loadProtokoll(id)
  }

  async function saveGeraet() {
    setSavingGeraet(true)
    if (geraetForm.id) {
      await supabase.from('geraete').update(geraetForm).eq('id', geraetForm.id)
    } else {
      await supabase.from('geraete').insert(geraetForm)
    }
    setSavingGeraet(false)
    setShowGeraetForm(false)
    setGeraetForm(emptyGeraet)
    load()
  }

  async function updateStatus(geraet, newStatus) {
    await supabase.from('geraete').update({ status: newStatus }).eq('id', geraet.id)
    setGeraete(prev => prev.map(g => g.id === geraet.id ? { ...g, status: newStatus } : g))
  }

  async function saveProtokoll() {
    setSavingProtokoll(true)
    await supabase.from('maschinen_protokoll').insert({ ...protokollForm, geraet_id: showProtokollForm, fahrer_id: protokollForm.fahrer_id || user.id })
    setSavingProtokoll(false)
    setShowProtokollForm(null)
    setProtokollForm({ ...emptyProtokoll, datum: new Date().toISOString().split('T')[0] })
    loadProtokoll(showProtokollForm)
  }

  const filtered = filterStatus === 'alle' ? geraete : geraete.filter(g => g.status === filterStatus)
  const defektCount = geraete.filter(g => g.status === 'defekt').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Geräte & Maschinen</h2>
          {defektCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--red)', marginTop: 2 }}>
              <AlertTriangle size={13} /> {defektCount} defekt
            </div>
          )}
        </div>
        {isChef && (
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => { setGeraetForm(emptyGeraet); setShowGeraetForm(true) }}>
            <Plus size={16} /> Neu
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {['alle', ...Object.keys(statusConfig)].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
            background: filterStatus === s ? 'var(--orange)' : 'var(--bg-card)',
            color: filterStatus === s ? 'white' : 'var(--text-muted)',
          }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'alle' && <span style={{ marginLeft: 4 }}>({geraete.filter(g => g.status === s).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><Wrench /><p>Keine Geräte vorhanden</p></div></div>
      ) : (
        filtered.map(g => {
          const sc = statusConfig[g.status] ?? statusConfig['verfügbar']
          const isOpen = expanded === g.id
          const pList = protokolle[g.id] ?? []

          return (
            <div key={g.id} className="card" style={{ marginBottom: 10 }}>
              {/* Gerät Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ background: sc.bg, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                  <Wrench size={20} color={sc.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{g.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {g.typ}{g.kennzeichen ? ` · ${g.kennzeichen}` : ''}{g.baujahr ? ` · Bj. ${g.baujahr}` : ''}
                  </div>
                  {g.notizen && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{g.notizen}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  {/* Status Badge (klickbar für Chef) */}
                  {isChef ? (
                    <select
                      value={g.status}
                      onChange={e => updateStatus(g, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        background: sc.bg, border: `1px solid ${sc.color}`, color: sc.color,
                        borderRadius: 8, padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700,
                        cursor: 'pointer', appearance: 'none',
                      }}
                    >
                      {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  ) : (
                    <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}`, borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {sc.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Defekt-Hinweis */}
              {g.status === 'defekt' && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> Dieses Gerät ist als defekt gemeldet
                </div>
              )}

              {/* Aktionen */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setShowProtokollForm(g.id); setProtokollForm({ ...emptyProtokoll, datum: new Date().toISOString().split('T')[0] }) }}>
                  <Plus size={14} /> Protokolleintrag
                </button>
                <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => toggleExpand(g.id)}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isOpen ? 'Schließen' : 'Verlauf'}
                </button>
                {isChef && (
                  <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => { setGeraetForm(g); setShowGeraetForm(true) }}>
                    Bearbeiten
                  </button>
                )}
              </div>

              {/* Protokollverlauf */}
              {isOpen && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {pList.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: 12 }}>
                      Noch keine Einträge
                    </div>
                  ) : (
                    pList.map(p => (
                      <div key={p.id} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                            {new Date(p.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {p.fahrer?.vorname} {p.fahrer?.nachname}
                          </div>
                        </div>
                        {p.baustelle?.name && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--orange)', marginBottom: 4 }}>{p.baustelle.name}</div>
                        )}
                        <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          {p.betriebsstunden && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={11} /> {p.betriebsstunden}h
                            </span>
                          )}
                          {p.kraftstoff_liter && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Fuel size={11} /> {p.kraftstoff_liter}L
                            </span>
                          )}
                          {p.km_stand && <span>km {p.km_stand}</span>}
                        </div>
                        {p.bemerkungen && (
                          <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.bemerkungen}</div>
                        )}
                        {p.defekte && (
                          <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--red)', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                            <AlertTriangle size={12} style={{ marginTop: 1, flexShrink: 0 }} /> {p.defekte}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ── Gerät anlegen/bearbeiten Modal ── */}
      {showGeraetForm && (
        <div className="modal-overlay" onClick={() => setShowGeraetForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{geraetForm.id ? 'Gerät bearbeiten' : 'Neues Gerät'}</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowGeraetForm(false)}><X size={16} /></button>
            </div>
            <div className="input-group">
              <label className="input-label">Name *</label>
              <input type="text" placeholder="z.B. Bagger CAT 320" value={geraetForm.name} onChange={e => setGeraetForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Typ</label>
              <select value={geraetForm.typ} onChange={e => setGeraetForm(f => ({ ...f, typ: e.target.value }))}>
                {geraetTypen.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Kennzeichen</label>
                <input type="text" placeholder="SHA-BG 12" value={geraetForm.kennzeichen} onChange={e => setGeraetForm(f => ({ ...f, kennzeichen: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Baujahr</label>
                <input type="number" placeholder="2018" value={geraetForm.baujahr} onChange={e => setGeraetForm(f => ({ ...f, baujahr: e.target.value }))} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Seriennummer</label>
              <input type="text" value={geraetForm.seriennummer} onChange={e => setGeraetForm(f => ({ ...f, seriennummer: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Status</label>
              <select value={geraetForm.status} onChange={e => setGeraetForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Notizen</label>
              <textarea placeholder="Besonderheiten, Wartungshinweise..." value={geraetForm.notizen} onChange={e => setGeraetForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={saveGeraet} disabled={savingGeraet || !geraetForm.name}>
              {savingGeraet ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* ── Protokolleintrag Modal ── */}
      {showProtokollForm && (
        <div className="modal-overlay" onClick={() => setShowProtokollForm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Protokolleintrag</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowProtokollForm(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16, fontWeight: 600, fontSize: '0.9rem' }}>
              {geraete.find(g => g.id === showProtokollForm)?.name}
            </div>
            <div className="input-group">
              <label className="input-label">Datum</label>
              <input type="date" value={protokollForm.datum} onChange={e => setProtokollForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Baustelle</label>
              <select value={protokollForm.baustelle_id} onChange={e => setProtokollForm(f => ({ ...f, baustelle_id: e.target.value }))}>
                <option value="">-- Auswählen --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Fahrer / Bediener</label>
              <select value={protokollForm.fahrer_id} onChange={e => setProtokollForm(f => ({ ...f, fahrer_id: e.target.value }))}>
                <option value="">Ich selbst</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.vorname} {e.nachname}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Betriebsstd.</label>
                <input type="number" step="0.5" placeholder="8.5" value={protokollForm.betriebsstunden} onChange={e => setProtokollForm(f => ({ ...f, betriebsstunden: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Kraftstoff (L)</label>
                <input type="number" step="0.5" placeholder="60" value={protokollForm.kraftstoff_liter} onChange={e => setProtokollForm(f => ({ ...f, kraftstoff_liter: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">km-Stand</label>
                <input type="number" placeholder="12500" value={protokollForm.km_stand} onChange={e => setProtokollForm(f => ({ ...f, km_stand: e.target.value }))} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--red)' }}>⚠ Defekte / Mängel</label>
              <textarea placeholder="Hydrauliköl verliert, Bremse quietscht..." value={protokollForm.defekte} onChange={e => setProtokollForm(f => ({ ...f, defekte: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Bemerkungen</label>
              <textarea placeholder="Allgemeine Notizen zur Nutzung..." value={protokollForm.bemerkungen} onChange={e => setProtokollForm(f => ({ ...f, bemerkungen: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Fotos</label>
              <PhotoUpload
                folder={`geraete/${showProtokollForm}/${protokollForm.datum}`}
                existingUrls={protokollForm.foto_urls}
                onUploaded={url => setProtokollForm(f => ({ ...f, foto_urls: [...f.foto_urls, url] }))}
                onRemove={url => setProtokollForm(f => ({ ...f, foto_urls: f.foto_urls.filter(u => u !== url) }))}
                maxPhotos={5}
              />
            </div>
            <button className="btn btn-primary" onClick={saveProtokoll} disabled={savingProtokoll}>
              {savingProtokoll ? 'Speichern...' : 'Eintragen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
