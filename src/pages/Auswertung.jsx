import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { exportStundenzettelPDF, exportWochenberichtPDF } from '../lib/pdfExport'
import { Download, Calendar } from 'lucide-react'

const MONATE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

export default function Auswertung() {
  const { profile } = useAuth()
  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)

  const [monat, setMonat] = useState(new Date().getMonth())
  const [jahr, setJahr] = useState(new Date().getFullYear())
  const [perMitarbeiter, setPerMitarbeiter] = useState([])
  const [perBaustelle, setPerBaustelle]     = useState([])
  const [perTag, setPerTag]                 = useState([])
  const [gesamt, setGesamt]                 = useState(0)
  const [exporting, setExporting]           = useState(false)
  const [exportingKW, setExportingKW]       = useState(false)

  useEffect(() => { load() }, [monat, jahr])

  async function load() {
    const lastDay = new Date(jahr, monat + 1, 0).getDate()
    const von = `${jahr}-${String(monat + 1).padStart(2, '0')}-01`
    const bis = `${jahr}-${String(monat + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data } = await supabase
      .from('zeiterfassung')
      .select('*, mitarbeiter:profiles(vorname, nachname), baustelle:baustellen(name)')
      .gte('datum', von)
      .lte('datum', bis)
      .order('datum')

    if (!data) return

    // Gesamt
    const total = data.reduce((s, e) => s + Number(e.stunden || 0), 0)
    setGesamt(total.toFixed(1))

    // Per Mitarbeiter
    const mMap = {}
    data.forEach(e => {
      const key = `${e.mitarbeiter?.vorname} ${e.mitarbeiter?.nachname}`
      mMap[key] = (mMap[key] || 0) + Number(e.stunden || 0)
    })
    setPerMitarbeiter(Object.entries(mMap).map(([name, stunden]) => ({ name, stunden: +stunden.toFixed(1) })).sort((a,b) => b.stunden - a.stunden))

    // Per Baustelle
    const bMap = {}
    data.forEach(e => {
      const key = e.baustelle?.name || 'Unbekannt'
      bMap[key] = (bMap[key] || 0) + Number(e.stunden || 0)
    })
    setPerBaustelle(Object.entries(bMap).map(([name, stunden]) => ({ name: name.slice(0,20), stunden: +stunden.toFixed(1) })).sort((a,b) => b.stunden - a.stunden))

    // Per Tag
    const tMap = {}
    data.forEach(e => {
      tMap[e.datum] = (tMap[e.datum] || 0) + Number(e.stunden || 0)
    })
    setPerTag(Object.entries(tMap).map(([datum, stunden]) => ({
      tag: new Date(datum + 'T12:00:00').getDate() + '.',
      stunden: +stunden.toFixed(1)
    })))
  }

  async function handleExport() {
    setExporting(true)
    await exportStundenzettelPDF(monat, jahr)
    setExporting(false)
  }

  async function handleKWExport() {
    setExportingKW(true)
    await exportWochenberichtPDF(new Date())
    setExportingKW(false)
  }

  return (
    <div>
      <div className="page-header">
        <h2>Auswertung</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={handleKWExport} disabled={exportingKW}>
            <Calendar size={16} /> {exportingKW ? '...' : 'KW'}
          </button>
          <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={handleExport} disabled={exporting}>
            <Download size={16} /> {exporting ? '...' : 'Monat'}
          </button>
        </div>
      </div>

      {/* Monatsauswahl */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }}
          onClick={() => { if (monat === 0) { setMonat(11); setJahr(j => j-1) } else setMonat(m => m-1) }}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>
          {MONATE[monat]} {jahr}
        </span>
        <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }}
          onClick={() => { if (monat === 11) { setMonat(0); setJahr(j => j+1) } else setMonat(m => m+1) }}>›</button>
      </div>

      {/* Gesamt */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-number">{gesamt}</div>
          <div className="stat-label">Gesamtstunden</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{perMitarbeiter.length}</div>
          <div className="stat-label">Mitarbeiter aktiv</div>
        </div>
      </div>

      {/* Tagesverlauf */}
      {perTag.length > 0 && (
        <>
          <div className="section-title">Stunden pro Tag</div>
          <div className="card" style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={perTag} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="tag" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb' }} />
                <Bar dataKey="stunden" radius={[4,4,0,0]} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Per Mitarbeiter */}
      {isChef && perMitarbeiter.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>Stunden je Mitarbeiter</div>
          <div className="card" style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={Math.max(120, perMitarbeiter.length * 44)}>
              <BarChart data={perMitarbeiter} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#f9fafb', fontSize: 12 }} width={90} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb' }} />
                <Bar dataKey="stunden" radius={[0,4,4,0]} label={{ position: 'right', fill: '#f97316', fontSize: 12 }}>
                  {perMitarbeiter.map((_, i) => <Cell key={i} fill={i === 0 ? '#f97316' : '#374151'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Per Baustelle */}
      {perBaustelle.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>Stunden je Baustelle</div>
          <div className="card" style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={Math.max(120, perBaustelle.length * 44)}>
              <BarChart data={perBaustelle} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#f9fafb', fontSize: 12 }} width={90} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb' }} />
                <Bar dataKey="stunden" radius={[0,4,4,0]} fill="#3b82f6"
                  label={{ position: 'right', fill: '#3b82f6', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {perMitarbeiter.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: 30 }}>
            <p>Keine Daten für {MONATE[monat]} {jahr}</p>
          </div>
        </div>
      )}
    </div>
  )
}
