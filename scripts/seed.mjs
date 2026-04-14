import { createClient } from '@supabase/supabase-js'

// Werte aus .env oder direkt eintragen (niemals committen!)
const URL  = process.env.SUPABASE_URL  || 'https://DEIN-PROJEKT.supabase.co'
const KEY  = process.env.SUPABASE_SERVICE_KEY || 'DEIN-SERVICE-KEY'
const supabase = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// ── Hilfsfunktionen ──────────────────────────────────────────
async function createUser(email, password, vorname, nachname, rolle) {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { vorname, nachname }
  })
  if (error) { console.error(`User ${email}:`, error.message); return null }
  console.log(`✓ User: ${email} (${rolle})`)

  await supabase.from('profiles').upsert({
    id: data.user.id, vorname, nachname, rolle
  })
  return data.user.id
}

async function main() {
  console.log('\n=== NUTZER ===')
  const admin  = 'dec01658-a4de-4eb3-ae22-536584e59e35' // bereits vorhanden
  await supabase.from('profiles').upsert({ id: admin, vorname: 'Admin', nachname: 'Chef', rolle: 'chef' })

  const u1 = await createUser('hans.mueller@mele.de',    'test123', 'Hans',    'Müller',  'bauleiter')
  const u2 = await createUser('thomas.schmidt@mele.de',  'test123', 'Thomas',  'Schmidt', 'polier')
  const u3 = await createUser('michael.weber@mele.de',   'test123', 'Michael', 'Weber',   'arbeiter')
  const u4 = await createUser('peter.klein@mele.de',     'test123', 'Peter',   'Klein',   'arbeiter')

  // ── BAUSTELLEN ──────────────────────────────────────────────
  console.log('\n=== BAUSTELLEN ===')
  const { data: bs } = await supabase.from('baustellen').insert([
    { name: 'B14 Ortsdurchfahrt Mitte',      adresse: 'B14, 74523 Schwäbisch Hall',    auftraggeber: 'Landratsamt SHA',    status: 'aktiv',         notizen: 'Vollsperrung Mo–Fr 7–17 Uhr' },
    { name: 'K2234 Deckenerneuerung Nord',    adresse: 'K2234, 74572 Blaufelden',       auftraggeber: 'Gemeinde Blaufelden', status: 'aktiv',         notizen: 'Halbseitige Sperrung, LSA vorhanden' },
    { name: 'Parkplatz Rathaus Crailsheim',   adresse: 'Marktplatz 1, 74564 Crailsheim',auftraggeber: 'Stadt Crailsheim',  status: 'aktiv',         notizen: '' },
    { name: 'Gemeindestraße Kirchberg',       adresse: 'Hauptstr. 45, 74592 Kirchberg', auftraggeber: 'Gemeinde Kirchberg', status: 'abgeschlossen', notizen: 'Abgenommen am 10.03.2026' },
  ]).select()
  bs.forEach(b => console.log(`✓ Baustelle: ${b.name}`))
  const [b1, b2, b3] = bs

  // ── ZEITERFASSUNG ────────────────────────────────────────────
  console.log('\n=== ZEITERFASSUNG ===')
  const zeitDaten = [
    { mitarbeiter_id: u3, baustelle_id: b1.id, datum: '2026-04-07', von: '07:00', bis: '16:30', pause_min: 30, stunden: 9.0, taetigkeit: 'Asphalteinbau' },
    { mitarbeiter_id: u3, baustelle_id: b1.id, datum: '2026-04-08', von: '07:00', bis: '16:00', pause_min: 30, stunden: 8.5, taetigkeit: 'Bordsteinarbeiten' },
    { mitarbeiter_id: u3, baustelle_id: b2.id, datum: '2026-04-09', von: '07:00', bis: '15:30', pause_min: 30, stunden: 8.0, taetigkeit: 'Erdarbeiten' },
    { mitarbeiter_id: u4, baustelle_id: b1.id, datum: '2026-04-07', von: '07:00', bis: '16:30', pause_min: 30, stunden: 9.0, taetigkeit: 'Asphalteinbau' },
    { mitarbeiter_id: u4, baustelle_id: b2.id, datum: '2026-04-08', von: '06:30', bis: '15:30', pause_min: 30, stunden: 8.5, taetigkeit: 'Pflasterarbeiten' },
    { mitarbeiter_id: u4, baustelle_id: b3.id, datum: '2026-04-09', von: '07:00', bis: '16:00', pause_min: 30, stunden: 8.5, taetigkeit: 'Aufräumen' },
    { mitarbeiter_id: u2, baustelle_id: b1.id, datum: '2026-04-07', von: '06:30', bis: '17:00', pause_min: 30, stunden: 10.0, taetigkeit: 'Markierungsarbeiten' },
    { mitarbeiter_id: u2, baustelle_id: b2.id, datum: '2026-04-10', von: '07:00', bis: '16:00', pause_min: 30, stunden: 8.5, taetigkeit: 'Asphalteinbau' },
    { mitarbeiter_id: u1, baustelle_id: b1.id, datum: '2026-04-11', von: '07:00', bis: '17:00', pause_min: 30, stunden: 9.5, taetigkeit: 'Erdarbeiten' },
  ].filter(e => e.mitarbeiter_id)

  const { error: zErr } = await supabase.from('zeiterfassung').insert(zeitDaten)
  if (zErr) console.error('Zeiterfassung:', zErr.message)
  else console.log(`✓ ${zeitDaten.length} Zeiteinträge`)

  // ── TAGESBERICHTE ────────────────────────────────────────────
  console.log('\n=== TAGESBERICHTE ===')
  const berichte = [
    {
      baustelle_id: b1.id, erstellt_von: u2, datum: '2026-04-07',
      wetter: 'Sonnig', temperatur: 14, personal_anzahl: 6, geraete: 'Fertiger, 2x LKW, Walze',
      ausgefuehrte_arbeiten: 'Asphalteinbau auf 180m Länge abgeschlossen. Oberschicht auf rechter Fahrbahnhälfte fertiggestellt. Qualitätskontrolle bestanden.',
      vorkommnisse: '', verzoegerungen: '', foto_urls: []
    },
    {
      baustelle_id: b1.id, erstellt_von: u2, datum: '2026-04-08',
      wetter: 'Bewölkt', temperatur: 11, personal_anzahl: 5, geraete: 'Bagger, LKW, Rüttelplatte',
      ausgefuehrte_arbeiten: 'Bordsteinarbeiten abgeschlossen. 120m Tiefbord gesetzt. Hinterfüllung mit Beton erfolgt.',
      vorkommnisse: 'Wasserrohrbruch an Kreuzung entdeckt, Stadtwerke informiert.',
      verzoegerungen: 'Arbeiten 2h unterbrochen wegen Wasserrohrbruch.', foto_urls: []
    },
    {
      baustelle_id: b2.id, erstellt_von: u2, datum: '2026-04-09',
      wetter: 'Leichter Regen', temperatur: 9, personal_anzahl: 4, geraete: 'Fräse, LKW',
      ausgefuehrte_arbeiten: 'Aufnahme der alten Deckschicht auf 200m abgeschlossen. Material abtransportiert.',
      vorkommnisse: '', verzoegerungen: 'Regen hat Arbeit verlangsamt, ca. 1h Verlust.', foto_urls: []
    },
    {
      baustelle_id: b3.id, erstellt_von: u1, datum: '2026-04-10',
      wetter: 'Sonnig', temperatur: 16, personal_anzahl: 3, geraete: 'Rüttelplatte, Minibagger',
      ausgefuehrte_arbeiten: 'Unterbau Parkplatz fertiggestellt. Schottertragschicht eingebaut und verdichtet. 850m² abgeschlossen.',
      vorkommnisse: '', verzoegerungen: '', foto_urls: []
    },
  ].filter(b => b.erstellt_von)

  const { error: bErr } = await supabase.from('tagesberichte').insert(berichte)
  if (bErr) console.error('Tagesberichte:', bErr.message)
  else console.log(`✓ ${berichte.length} Tagesberichte`)

  // ── EINSATZPLANUNG ───────────────────────────────────────────
  console.log('\n=== EINSATZPLANUNG ===')
  const planung = [
    { datum: '2026-04-14', mitarbeiter_id: u3, baustelle_id: b1.id, notiz: '' },
    { datum: '2026-04-14', mitarbeiter_id: u4, baustelle_id: b2.id, notiz: '' },
    { datum: '2026-04-14', mitarbeiter_id: u2, baustelle_id: b1.id, notiz: 'Markierungen fertigstellen' },
    { datum: '2026-04-15', mitarbeiter_id: u3, baustelle_id: b2.id, notiz: '' },
    { datum: '2026-04-15', mitarbeiter_id: u4, baustelle_id: b1.id, notiz: '' },
    { datum: '2026-04-15', mitarbeiter_id: u2, baustelle_id: b3.id, notiz: 'Asphalt Parkplatz' },
    { datum: '2026-04-16', mitarbeiter_id: u3, baustelle_id: b3.id, notiz: '' },
    { datum: '2026-04-16', mitarbeiter_id: u4, baustelle_id: b2.id, notiz: '' },
    { datum: '2026-04-16', mitarbeiter_id: u1, baustelle_id: b1.id, notiz: 'Abnahme vorbereiten' },
    { datum: '2026-04-17', mitarbeiter_id: u3, baustelle_id: b1.id, notiz: '' },
    { datum: '2026-04-17', mitarbeiter_id: u4, baustelle_id: b3.id, notiz: '' },
  ].filter(p => p.mitarbeiter_id)

  const { error: pErr } = await supabase.from('einsatzplanung').insert(planung)
  if (pErr) console.error('Planung:', pErr.message)
  else console.log(`✓ ${planung.length} Planungseinträge`)

  // ── AUFGABEN & MÄNGEL ────────────────────────────────────────
  console.log('\n=== AUFGABEN ===')
  const aufgaben = [
    { baustelle_id: b1.id, erstellt_von: u2, titel: 'Wasserrohrbruch Kreuzung dokumentieren', beschreibung: 'Stadtwerke kontaktieren, Protokoll anfertigen, Schadensfotos sichern.', prioritaet: 'hoch', status: 'in Bearbeitung', faellig_am: '2026-04-15', foto_urls: [] },
    { baustelle_id: b1.id, erstellt_von: u1, titel: 'Randstein km 0+340 nacharbeiten', beschreibung: '3 Randsteine sitzen nicht plan. Müssen nochmal gesetzt werden.', prioritaet: 'mittel', status: 'offen', faellig_am: '2026-04-17', foto_urls: [] },
    { baustelle_id: b2.id, erstellt_von: u2, titel: 'Fahrbahnmarkierung erneuern', beschreibung: 'Alte Markierungen nach Fräsung noch sichtbar. Müssen entfernt werden vor neuem Einbau.', prioritaet: 'niedrig', status: 'offen', faellig_am: '2026-04-20', foto_urls: [] },
    { baustelle_id: b2.id, erstellt_von: u2, titel: 'LSA Steuergerät prüfen lassen', beschreibung: 'Ampelanlage schaltet unregelmäßig. Stadtverwaltung informiert, Techniker kommt Donnerstag.', prioritaet: 'hoch', status: 'in Bearbeitung', faellig_am: '2026-04-14', foto_urls: [] },
    { baustelle_id: b3.id, erstellt_von: u1, titel: 'Entwässerungsrinnen bestellen', beschreibung: '12 Laufmeter ACO Rinnen Typ K100 fehlen noch. Lieferung bis 16.04 bestätigt?', prioritaet: 'mittel', status: 'offen', faellig_am: '2026-04-16', foto_urls: [] },
    { baustelle_id: b1.id, erstellt_von: u2, titel: 'Abnahmeprotokoll Abschnitt 1 vorbereiten', beschreibung: 'Checkliste durchgehen, Aufmaß prüfen, Fotos bereitstellen.', prioritaet: 'hoch', status: 'offen', faellig_am: '2026-04-16', foto_urls: [] },
    { baustelle_id: b3.id, erstellt_von: u1, titel: 'Signalanlage zurückbauen', beschreibung: 'Baustellenampeln abbauen und lagern nach Fertigstellung.', prioritaet: 'niedrig', status: 'erledigt', faellig_am: null, foto_urls: [] },
  ].filter(a => a.erstellt_von)

  const { error: aErr } = await supabase.from('aufgaben').insert(aufgaben)
  if (aErr) console.error('Aufgaben:', aErr.message)
  else console.log(`✓ ${aufgaben.length} Aufgaben`)

  console.log('\n✅ Seed abgeschlossen!\n')
  console.log('Zugangsdaten:')
  console.log('  admin@admin.de         / admin    (Chef)')
  console.log('  hans.mueller@mele.de   / test123  (Bauleiter)')
  console.log('  thomas.schmidt@mele.de / test123  (Polier)')
  console.log('  michael.weber@mele.de  / test123  (Arbeiter)')
  console.log('  peter.klein@mele.de    / test123  (Arbeiter)')
}

main().catch(console.error)
