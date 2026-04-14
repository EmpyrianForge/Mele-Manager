import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'
import { parseFoto } from './fotoUtils'

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const WOCHENTAGE = ['So','Mo','Di','Mi','Do','Fr','Sa']

function header(doc, titel) {
  doc.setFillColor(249, 115, 22)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('MeLe Baustellenmanager', 14, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(titel, 140, 12)
  doc.setTextColor(0, 0, 0)
}

// ── Stundenzettel (alle Mitarbeiter eines Monats) ─────────────
export async function exportStundenzettelPDF(monat, jahr) {
  const lastDay = new Date(jahr, monat + 1, 0).getDate()
  const von = `${jahr}-${String(monat + 1).padStart(2, '0')}-01`
  const bis = `${jahr}-${String(monat + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data } = await supabase
    .from('zeiterfassung')
    .select('*, mitarbeiter:profiles(vorname, nachname), baustelle:baustellen(name)')
    .gte('datum', von).lte('datum', bis)
    .order('mitarbeiter_id').order('datum')

  if (!data?.length) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  header(doc, `Stundenzettel ${MONATE[monat]} ${jahr}`)

  const byMa = {}
  data.forEach(e => {
    const key = `${e.mitarbeiter?.vorname} ${e.mitarbeiter?.nachname}`
    if (!byMa[key]) byMa[key] = []
    byMa[key].push(e)
  })

  let y = 26
  Object.entries(byMa).forEach(([name, eintraege]) => {
    const gesamt = eintraege.reduce((s, e) => s + Number(e.stunden || 0), 0)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(name, 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Gesamt: ${gesamt.toFixed(1)}h`, 170, y, { align: 'right' })
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Datum', 'Baustelle', 'Von', 'Bis', 'Pause', 'Stunden', 'Tätigkeit']],
      body: eintraege.map(e => [
        new Date(e.datum + 'T12:00:00').toLocaleDateString('de-DE'),
        e.baustelle?.name || '',
        e.von, e.bis, `${e.pause_min} min`, `${e.stunden}h`, e.taetigkeit || ''
      ]),
      foot: [[{ content: `Gesamt: ${gesamt.toFixed(1)} Stunden`, colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' } }]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [243, 244, 246], textColor: [0,0,0] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 10
    if (y > 260) { doc.addPage(); header(doc, `Stundenzettel ${MONATE[monat]} ${jahr}`); y = 26 }
  })

  doc.save(`Stundenzettel_${MONATE[monat]}_${jahr}.pdf`)
}

// ── Wochenbericht ─────────────────────────────────────────────
export async function exportWochenberichtPDF(anyDateInWeek = new Date()) {
  // Montag der Woche berechnen
  const d = new Date(anyDateInWeek)
  const dow = d.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const von = monday.toISOString().split('T')[0]
  const bis = sunday.toISOString().split('T')[0]

  // KW berechnen
  const kw = getKW(monday)
  const label = `KW ${kw} · ${monday.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const [{ data: zeitDaten }, { data: berichte }] = await Promise.all([
    supabase.from('zeiterfassung').select('*, mitarbeiter:profiles(vorname, nachname), baustelle:baustellen(name)').gte('datum', von).lte('datum', bis).order('datum'),
    supabase.from('tagesberichte').select('*, baustelle:baustellen(name), ersteller:profiles(vorname, nachname)').gte('datum', von).lte('datum', bis).order('datum'),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  header(doc, 'Wochenbericht')

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(label, 14, 28)
  doc.setFont('helvetica', 'normal')

  let y = 36

  // ── Stunden pro Mitarbeiter ──
  if (zeitDaten?.length) {
    const gesamtStunden = zeitDaten.reduce((s, e) => s + Number(e.stunden || 0), 0)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Gesamtstunden: ${gesamtStunden.toFixed(1)}h`, 14, y)
    y += 6

    const byMa = {}
    zeitDaten.forEach(e => {
      const key = `${e.mitarbeiter?.vorname} ${e.mitarbeiter?.nachname}`
      if (!byMa[key]) byMa[key] = { stunden: 0, tage: new Set(), baustellen: new Set() }
      byMa[key].stunden += Number(e.stunden || 0)
      byMa[key].tage.add(e.datum)
      if (e.baustelle?.name) byMa[key].baustellen.add(e.baustelle.name)
    })

    autoTable(doc, {
      startY: y,
      head: [['Mitarbeiter', 'Einsatztage', 'Baustellen', 'Stunden gesamt']],
      body: Object.entries(byMa).map(([name, d]) => [
        name,
        d.tage.size,
        [...d.baustellen].join(', '),
        `${d.stunden.toFixed(1)}h`,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // ── Tagesberichte der Woche ──
  if (berichte?.length) {
    if (y > 220) { doc.addPage(); header(doc, 'Wochenbericht'); y = 26 }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Tagesberichte', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['Datum', 'Baustelle', 'Wetter', 'Personal', 'Erstellt von']],
      body: berichte.map(b => [
        new Date(b.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }),
        b.baustelle?.name || '',
        `${b.wetter}${b.temperatur ? ' ' + b.temperatur + '°C' : ''}`,
        b.personal_anzahl ? `${b.personal_anzahl} Pers.` : '–',
        `${b.ersteller?.vorname} ${b.ersteller?.nachname}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8

    // Berichtsinhalt
    berichte.forEach(b => {
      if (!b.ausgefuehrte_arbeiten) return
      if (y > 240) { doc.addPage(); header(doc, 'Wochenbericht'); y = 26 }

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const datumStr = new Date(b.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
      doc.text(`${datumStr} – ${b.baustelle?.name || ''}`, 14, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(b.ausgefuehrte_arbeiten, 182)
      doc.text(lines, 14, y)
      y += lines.length * 4.5 + 4

      if (b.vorkommnisse) {
        doc.setTextColor(220, 150, 30)
        const vlines = doc.splitTextToSize(`Vorkommnis: ${b.vorkommnisse}`, 182)
        doc.text(vlines, 14, y)
        doc.setTextColor(0, 0, 0)
        y += vlines.length * 4.5 + 2
      }
    })
  }

  if (!zeitDaten?.length && !berichte?.length) {
    doc.setFontSize(11)
    doc.setTextColor(150, 150, 150)
    doc.text('Keine Daten für diese Woche vorhanden.', 14, 40)
  }

  doc.save(`Wochenbericht_KW${kw}_${monday.getFullYear()}.pdf`)
}

function getKW(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

// ── Tagesbericht als PDF ──────────────────────────────────────
export async function exportTagesberichtPDF(berichtId) {
  const { data: b } = await supabase
    .from('tagesberichte')
    .select('*, baustelle:baustellen(name, adresse), ersteller:profiles(vorname, nachname)')
    .eq('id', berichtId).single()

  if (!b) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const datum = new Date(b.datum + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  header(doc, 'Tagesbericht')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(b.baustelle?.name || '', 14, 28)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(datum, 14, 35)
  doc.text(`Erstellt von: ${b.ersteller?.vorname} ${b.ersteller?.nachname}`, 14, 41)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 48,
    body: [
      ['Wetter', `${b.wetter}${b.temperatur ? ', ' + b.temperatur + '°C' : ''}`],
      ['Personal', b.personal_anzahl ? `${b.personal_anzahl} Personen` : '–'],
      ['Geräte / Fahrzeuge', b.geraete || '–'],
    ],
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [243, 244, 246] } },
    margin: { left: 14, right: 14 },
  })

  let y = doc.lastAutoTable.finalY + 8

  const sections = [
    ['Ausgeführte Arbeiten', b.ausgefuehrte_arbeiten],
    ['Vorkommnisse / Mängel', b.vorkommnisse],
    ['Verzögerungen', b.verzoegerungen],
  ]

  sections.forEach(([titel, text]) => {
    if (!text) return
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(titel, 14, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(text, 182)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 6
  })

  if (b.foto_urls?.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Fotos', 14, y)
    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    b.foto_urls.forEach((encoded, i) => {
      const { url, kommentar } = parseFoto(encoded)
      const label = kommentar ? `[Foto ${i+1}] ${kommentar} – ${url}` : `[Foto ${i+1}] ${url}`
      const lines = doc.splitTextToSize(label, 182)
      doc.text(lines, 14, y)
      y += lines.length * 5
    })
    doc.setTextColor(0, 0, 0)
  }

  y = Math.max(y + 10, 250)
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, 80, y)
  doc.line(110, y, 196, y)
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Datum / Unterschrift Polier', 14, y + 5)
  doc.text('Datum / Unterschrift Bauleiter', 110, y + 5)

  doc.save(`Tagesbericht_${b.datum}_${(b.baustelle?.name || '').replace(/\s+/g,'_')}.pdf`)
}
