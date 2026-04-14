-- ============================================================
-- MeLe Testdaten – Supabase SQL Editor
-- ============================================================

-- 1) Trigger vorübergehend deaktivieren (verhindert Fehler beim User-Insert)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2) Test-User direkt in auth.users anlegen (Passwort: test123)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES
  ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'hans.mueller@mele.de',    '$2a$10$PzmPFAtC77F3P.mN6BXFV.lXICa8ZXlTHbXoKnnvvpqcuhlRBY3pi', now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'thomas.schmidt@mele.de',  '$2a$10$PzmPFAtC77F3P.mN6BXFV.lXICa8ZXlTHbXoKnnvvpqcuhlRBY3pi', now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('33333333-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'michael.weber@mele.de',   '$2a$10$PzmPFAtC77F3P.mN6BXFV.lXICa8ZXlTHbXoKnnvvpqcuhlRBY3pi', now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'peter.klein@mele.de',     '$2a$10$PzmPFAtC77F3P.mN6BXFV.lXICa8ZXlTHbXoKnnvvpqcuhlRBY3pi', now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO NOTHING;

-- auth.identities braucht Supabase für Email-Login
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', 'hans.mueller@mele.de',    '{"sub":"11111111-0000-0000-0000-000000000001","email":"hans.mueller@mele.de"}',    'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000002', 'thomas.schmidt@mele.de',  '{"sub":"22222222-0000-0000-0000-000000000002","email":"thomas.schmidt@mele.de"}',  'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-0000-0000-0000-000000000003', 'michael.weber@mele.de',   '{"sub":"33333333-0000-0000-0000-000000000003","email":"michael.weber@mele.de"}',   'email', now(), now(), now()),
  (gen_random_uuid(), '44444444-0000-0000-0000-000000000004', 'peter.klein@mele.de',     '{"sub":"44444444-0000-0000-0000-000000000004","email":"peter.klein@mele.de"}',     'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- 3) Profile anlegen
INSERT INTO profiles (id, vorname, nachname, rolle) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Hans',    'Müller',  'bauleiter'),
  ('22222222-0000-0000-0000-000000000002', 'Thomas',  'Schmidt', 'polier'),
  ('33333333-0000-0000-0000-000000000003', 'Michael', 'Weber',   'arbeiter'),
  ('44444444-0000-0000-0000-000000000004', 'Peter',   'Klein',   'arbeiter')
ON CONFLICT (id) DO UPDATE SET vorname = EXCLUDED.vorname, nachname = EXCLUDED.nachname, rolle = EXCLUDED.rolle;

-- Admin-Profil updaten
UPDATE profiles SET vorname = 'Admin', nachname = 'Chef', rolle = 'chef'
WHERE id = 'dec01658-a4de-4eb3-ae22-536584e59e35';

-- 4) Trigger wiederherstellen
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, vorname, nachname, rolle)
  VALUES (NEW.id, '', '', 'arbeiter')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BAUSTELLEN (IDs merken für Folgeschritte)
-- ============================================================
INSERT INTO baustellen (id, name, adresse, auftraggeber, status, notizen) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'B14 Ortsdurchfahrt Mitte',    'B14, 74523 Schwäbisch Hall',     'Landratsamt SHA',    'aktiv',         'Vollsperrung Mo–Fr 7–17 Uhr'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'K2234 Deckenerneuerung Nord',  'K2234, 74572 Blaufelden',        'Gemeinde Blaufelden','aktiv',         'Halbseitige Sperrung, LSA vorhanden'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Parkplatz Rathaus Crailsheim', 'Marktplatz 1, 74564 Crailsheim', 'Stadt Crailsheim',   'aktiv',         ''),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Gemeindestraße Kirchberg',     'Hauptstr. 45, 74592 Kirchberg',  'Gemeinde Kirchberg', 'abgeschlossen', 'Abgenommen 10.03.2026')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ZEITERFASSUNG
-- ============================================================
INSERT INTO zeiterfassung (mitarbeiter_id, baustelle_id, datum, von, bis, pause_min, stunden, taetigkeit) VALUES
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-04-07', '07:00', '16:30', 30, 9.0,  'Asphalteinbau'),
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-04-08', '07:00', '16:00', 30, 8.5,  'Bordsteinarbeiten'),
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', '2026-04-09', '07:00', '15:30', 30, 8.0,  'Erdarbeiten'),
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-04-10', '07:00', '16:00', 30, 8.5,  'Asphalteinbau'),
  ('44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-04-07', '07:00', '16:30', 30, 9.0,  'Asphalteinbau'),
  ('44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', '2026-04-08', '06:30', '15:30', 30, 8.5,  'Pflasterarbeiten'),
  ('44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', '2026-04-09', '07:00', '16:00', 30, 8.5,  'Aufräumen'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-04-07', '06:30', '17:00', 30, 10.0, 'Markierungsarbeiten'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '2026-04-10', '07:00', '16:00', 30, 8.5,  'Asphalteinbau'),
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-04-11', '07:00', '17:00', 30, 9.5,  'Erdarbeiten'),
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', '2026-04-13', '07:00', '16:00', 30, 8.5,  'Kanalbau');

-- ============================================================
-- TAGESBERICHTE
-- ============================================================
INSERT INTO tagesberichte (baustelle_id, erstellt_von, datum, wetter, temperatur, personal_anzahl, geraete, ausgefuehrte_arbeiten, vorkommnisse, verzoegerungen) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '2026-04-07', 'Sonnig',       14, 6, 'Fertiger, 2x LKW, Walze',
   'Asphalteinbau auf 180m abgeschlossen. Oberschicht rechte Fahrbahnhälfte fertiggestellt. Qualitätskontrolle bestanden.',
   '', ''),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '2026-04-08', 'Bewölkt',      11, 5, 'Bagger, LKW, Rüttelplatte',
   'Bordsteinarbeiten abgeschlossen. 120m Tiefbord gesetzt. Hinterfüllung mit Beton erfolgt.',
   'Wasserrohrbruch an Kreuzung entdeckt, Stadtwerke informiert.', 'Arbeiten 2h unterbrochen wegen Wasserrohrbruch.'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '2026-04-09', 'Leichter Regen', 9, 4, 'Fräse, LKW',
   'Aufnahme der alten Deckschicht auf 200m abgeschlossen. Material abtransportiert.',
   '', 'Regen hat Arbeit verlangsamt, ca. 1h Verlust.'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '2026-04-10', 'Sonnig',       16, 3, 'Rüttelplatte, Minibagger',
   'Unterbau Parkplatz fertiggestellt. Schottertragschicht eingebaut und verdichtet. 850m² abgeschlossen.',
   '', ''),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '2026-04-11', 'Bewölkt',      12, 7, 'Fertiger, Walze, 3x LKW',
   'Zweite Hälfte Fahrbahn eingebaut. Gesamteinbau B14 Abschnitt 1 fertiggestellt.',
   '', '');

-- ============================================================
-- EINSATZPLANUNG (KW 15–16)
-- ============================================================
INSERT INTO einsatzplanung (datum, mitarbeiter_id, baustelle_id, notiz) VALUES
  ('2026-04-14', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', ''),
  ('2026-04-14', '44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', ''),
  ('2026-04-14', '22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Markierungen fertigstellen'),
  ('2026-04-15', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', ''),
  ('2026-04-15', '44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', ''),
  ('2026-04-15', '22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'Asphalt Parkplatz'),
  ('2026-04-16', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', ''),
  ('2026-04-16', '44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', ''),
  ('2026-04-16', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Abnahme vorbereiten'),
  ('2026-04-17', '33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', ''),
  ('2026-04-17', '44444444-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', ''),
  ('2026-04-22', '11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'Abschlussbegehung')
ON CONFLICT (datum, mitarbeiter_id) DO NOTHING;

-- ============================================================
-- AUFGABEN & MÄNGEL
-- ============================================================
INSERT INTO aufgaben (baustelle_id, erstellt_von, titel, beschreibung, prioritaet, status, faellig_am) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
   'Wasserrohrbruch Kreuzung dokumentieren',
   'Stadtwerke kontaktieren, Protokoll anfertigen, Schadensfotos sichern.',
   'hoch', 'in Bearbeitung', '2026-04-15'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Randstein km 0+340 nacharbeiten',
   '3 Randsteine sitzen nicht plan. Müssen nochmal gesetzt werden.',
   'mittel', 'offen', '2026-04-17'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'Fahrbahnmarkierung erneuern',
   'Alte Markierungen nach Fräsung noch sichtbar. Vor neuem Einbau entfernen.',
   'niedrig', 'offen', '2026-04-20'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
   'LSA Steuergerät prüfen lassen',
   'Ampelanlage schaltet unregelmäßig. Techniker kommt Donnerstag.',
   'hoch', 'in Bearbeitung', '2026-04-14'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'Entwässerungsrinnen bestellen',
   '12 Laufmeter ACO Rinnen Typ K100 fehlen. Lieferung bis 16.04 bestätigt?',
   'mittel', 'offen', '2026-04-16'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
   'Abnahmeprotokoll Abschnitt 1 vorbereiten',
   'Checkliste durchgehen, Aufmaß prüfen, Fotos bereitstellen.',
   'hoch', 'offen', '2026-04-16'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'Signalanlage zurückbauen',
   'Baustellenampeln abbauen und lagern nach Fertigstellung.',
   'niedrig', 'erledigt', NULL);

-- ============================================================
-- FERTIG – Zugangsdaten:
-- admin@admin.de          / admin    → Chef
-- hans.mueller@mele.de    / test123  → Bauleiter
-- thomas.schmidt@mele.de  / test123  → Polier
-- michael.weber@mele.de   / test123  → Arbeiter
-- peter.klein@mele.de     / test123  → Arbeiter
-- ============================================================
