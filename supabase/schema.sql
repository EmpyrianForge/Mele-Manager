-- ============================================================
-- MeLe Baustellenmanager – Supabase Schema
-- Ausführen im Supabase SQL Editor
-- ============================================================

-- Rollen-Typ
CREATE TYPE rolle AS ENUM ('chef', 'bauleiter', 'polier', 'arbeiter');

-- Baustellen-Status
CREATE TYPE baustellen_status AS ENUM ('geplant', 'aktiv', 'pausiert', 'abgeschlossen');

-- Aufgaben-Priorität & Status
CREATE TYPE aufgabe_prioritaet AS ENUM ('hoch', 'mittel', 'niedrig');
CREATE TYPE aufgabe_status AS ENUM ('offen', 'in Bearbeitung', 'erledigt');

-- ============================================================
-- PROFILES (erweitert auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vorname     TEXT NOT NULL,
  nachname    TEXT NOT NULL,
  rolle       rolle NOT NULL DEFAULT 'arbeiter',
  telefon     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Trigger: Profil automatisch anlegen bei Registrierung
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, vorname, nachname, rolle)
  VALUES (NEW.id, '', '', 'arbeiter');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- BAUSTELLEN
-- ============================================================
CREATE TABLE baustellen (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  adresse                   TEXT,
  auftraggeber              TEXT,
  ansprechpartner_telefon   TEXT,
  status                    baustellen_status NOT NULL DEFAULT 'aktiv',
  notizen                   TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ZEITERFASSUNG
-- ============================================================
CREATE TABLE zeiterfassung (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitarbeiter_id  UUID NOT NULL REFERENCES profiles(id),
  baustelle_id    UUID NOT NULL REFERENCES baustellen(id),
  datum           DATE NOT NULL,
  von             TIME NOT NULL,
  bis             TIME NOT NULL,
  pause_min       INTEGER DEFAULT 30,
  stunden         NUMERIC(4,2),
  taetigkeit      TEXT,
  notiz           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TAGESBERICHTE
-- ============================================================
CREATE TABLE tagesberichte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id          UUID NOT NULL REFERENCES baustellen(id),
  erstellt_von          UUID NOT NULL REFERENCES profiles(id),
  datum                 DATE NOT NULL,
  wetter                TEXT,
  temperatur            INTEGER,
  personal_anzahl       INTEGER,
  geraete               TEXT,
  ausgefuehrte_arbeiten TEXT NOT NULL,
  vorkommnisse          TEXT,
  verzoegerungen        TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (baustelle_id, datum)
);

-- ============================================================
-- EINSATZPLANUNG
-- ============================================================
CREATE TABLE einsatzplanung (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum           DATE NOT NULL,
  mitarbeiter_id  UUID NOT NULL REFERENCES profiles(id),
  baustelle_id    UUID NOT NULL REFERENCES baustellen(id),
  notiz           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (datum, mitarbeiter_id)
);

-- ============================================================
-- AUFGABEN & MÄNGEL
-- ============================================================
CREATE TABLE aufgaben (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id  UUID REFERENCES baustellen(id),
  erstellt_von  UUID REFERENCES profiles(id),
  titel         TEXT NOT NULL,
  beschreibung  TEXT,
  prioritaet    aufgabe_prioritaet NOT NULL DEFAULT 'mittel',
  status        aufgabe_status NOT NULL DEFAULT 'offen',
  faellig_am    DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE baustellen       ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeiterfassung    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tagesberichte    ENABLE ROW LEVEL SECURITY;
ALTER TABLE einsatzplanung   ENABLE ROW LEVEL SECURITY;
ALTER TABLE aufgaben         ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Nutzer dürfen lesen und schreiben
-- (Für Produktion: feingranularere Policies nach Rolle anlegen!)
CREATE POLICY "auth_all" ON profiles         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON baustellen       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON zeiterfassung    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON tagesberichte    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON einsatzplanung   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON aufgaben         FOR ALL TO authenticated USING (true) WITH CHECK (true);
