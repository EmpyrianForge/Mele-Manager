import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

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
  const von = `${jahr}-${String(monat + 1).padStart(2, '0')}-01`
  const bis = `${jahr}-${String(monat + 1).padStart(2, '0')}-31`

  const { data } = await supabase
    .from('zeiterfassung')
    .select('*, mitarbeiter:profiles(vorname, nachname), baustelle:baustellen(name)')
    .gte('datum', von)
    .lte('datum', bis)
    .order('mitarbeiter_id')
    .order('datum')

  if (!data?.length) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  header(doc, `Stundenzettel ${MONATE[monat]} ${jahr}`)

  // Gruppieren nach Mitarbeiter
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
        e.von, e.bis,
        `${e.pause_min} min`,
        `${e.stunden}h`,
        e.taetigkeit || ''
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

// ── Tagesbericht als PDF ──────────────────────────────────────
export async function exportTagesberichtPDF(berichtId) {
  const { data: b } = await supabase
    .from('tagesberichte')
    .select('*, baustelle:baustellen(name, adresse), ersteller:profiles(vorname, nachname)')
    .eq('id', berichtId)
    .single()

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

  // Fotos
  if (b.foto_urls?.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Fotos', 14, y)
    y += 4
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    b.foto_urls.forEach((url, i) => {
      doc.text(`[Foto ${i+1}] ${url}`, 14, y)
      y += 5
    })
    doc.setTextColor(0, 0, 0)
  }

  // Unterschrift
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
