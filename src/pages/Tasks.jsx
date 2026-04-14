import { useEffect, useState } from 'react'
import { ClipboardList, Plus, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import { parseFoto } from '../lib/fotoUtils'

const prioritaeten = ['hoch', 'mittel', 'niedrig']
const statusOptionen = ['offen', 'in Bearbeitung', 'erledigt']
const statusColors = { offen: 'badge-red', 'in Bearbeitung': 'badge-yellow', erledigt: 'badge-green' }
const priorityColors = { hoch: 'badge-red', mittel: 'badge-yellow', niedrig: 'badge-blue' }

const emptyForm = { titel: '', beschreibung: '', baustelle_id: '', prioritaet: 'mittel', status: 'offen', faellig_am: '', foto_urls: [] }

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [sites, setSites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('alle')

  useEffect(() => {
    load()
    supabase.from('baustellen').select('id, name').then(({ data }) => setSites(data ?? []))
  }, [])

  async function load() {
    const { data } = await supabase
      .from('aufgaben')
      .select('*, baustelle:baustellen(name)')
      .order('prioritaet')
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
  }

  async function save() {
    setSaving(true)
    if (form.id) {
      await supabase.from('aufgaben').update(form).eq('id', form.id)
    } else {
      await supabase.from('aufgaben').insert({ ...form, erstellt_von: user.id })
    }
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
    load()
  }

  async function quickStatusChange(task, newStatus) {
    await supabase.from('aufgaben').update({ status: newStatus }).eq('id', task.id)
    load()
  }

  const filtered = filterStatus === 'alle' ? tasks : tasks.filter(t => t.status === filterStatus)

  return (
    <div>
      <div className="page-header">
        <h2>Aufgaben & Mängel</h2>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => { setForm(emptyForm); setShowForm(true) }}>
          <Plus size={16} /> Neu
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {['alle', 'offen', 'in Bearbeitung', 'erledigt'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: filterStatus === s ? 'var(--orange)' : 'var(--bg-card)',
              color: filterStatus === s ? 'white' : 'var(--text-muted)',
            }}
          >
            {s} {s !== 'alle' && <span>({tasks.filter(t => t.status === s).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><ClipboardList /><p>Keine Aufgaben</p></div></div>
      ) : (
        filtered.map(task => (
          <div key={task.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setForm(task); setShowForm(true) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{task.titel}</div>
                {task.baustelle?.name && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.baustelle.name}</div>}
                {task.faellig_am && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: 2 }}>
                    Fällig: {new Date(task.faellig_am + 'T12:00:00').toLocaleDateString('de-DE')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <span className={`badge ${priorityColors[task.prioritaet]}`}>{task.prioritaet}</span>
                <span className={`badge ${statusColors[task.status]}`}>{task.status}</span>
              </div>
            </div>
            {task.beschreibung && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{task.beschreibung.slice(0, 80)}{task.beschreibung.length > 80 ? '…' : ''}</p>}

            {task.foto_urls?.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                {task.foto_urls.map((encoded, i) => {
                  const { url, kommentar } = parseFoto(encoded)
                  return (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt="" onClick={() => window.open(url, '_blank')}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', display: 'block' }} />
                      {kommentar && (
                        <div title={kommentar} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', fontSize: '0.55rem', color: 'white', padding: '2px 3px', borderRadius: '0 0 6px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {kommentar}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick-Actions */}
            {task.status !== 'erledigt' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                {task.status === 'offen' && (
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => quickStatusChange(task, 'in Bearbeitung')}>
                    In Arbeit setzen
                  </button>
                )}
                <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => quickStatusChange(task, 'erledigt')}>
                  Erledigt
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{form.id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h3>
              <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            <div className="input-group">
              <label className="input-label">Titel *</label>
              <input type="text" placeholder="z.B. Randstein beschädigt" value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} />
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
                <label className="input-label">Priorität</label>
                <select value={form.prioritaet} onChange={e => setForm(f => ({ ...f, prioritaet: e.target.value }))}>
                  {prioritaeten.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {statusOptionen.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Fällig am</label>
              <input type="date" value={form.faellig_am} onChange={e => setForm(f => ({ ...f, faellig_am: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Beschreibung</label>
              <textarea placeholder="Details zum Mangel oder zur Aufgabe..." value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Fotos vom Mangel</label>
              <PhotoUpload
                folder={`aufgaben/${form.id || 'neu-' + Date.now()}`}
                existingUrls={form.foto_urls || []}
                onUploaded={url => setForm(f => ({ ...f, foto_urls: [...(f.foto_urls || []), url] }))}
                onRemove={encoded => setForm(f => ({ ...f, foto_urls: f.foto_urls.filter(u => u !== encoded) }))}
                onCommentChange={(old, updated) => setForm(f => ({ ...f, foto_urls: f.foto_urls.map(u => u === old ? updated : u) }))}
              />
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.titel}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
