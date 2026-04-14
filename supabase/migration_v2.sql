-- ── MeLe v2 Migration ────────────────────────────────────────────────────────

-- 1. GPS auf Zeiterfassung
ALTER TABLE zeiterfassung ADD COLUMN IF NOT EXISTS lat DECIMAL(9,6);
ALTER TABLE zeiterfassung ADD COLUMN IF NOT EXISTS lng DECIMAL(9,6);

-- 2. Krank/Urlaub Status auf Einsatzplanung
ALTER TABLE einsatzplanung ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'geplant';

-- 3. Geräte-Tabelle
CREATE TABLE IF NOT EXISTS geraete (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  typ        TEXT,
  kennzeichen TEXT,
  seriennummer TEXT,
  status     TEXT DEFAULT 'verfügbar',
  baujahr    INT,
  notizen    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Maschinenprotokoll
CREATE TABLE IF NOT EXISTS maschinen_protokoll (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geraet_id        UUID REFERENCES geraete(id) ON DELETE CASCADE,
  datum            DATE NOT NULL DEFAULT CURRENT_DATE,
  baustelle_id     UUID REFERENCES baustellen(id),
  fahrer_id        UUID REFERENCES profiles(id),
  betriebsstunden  DECIMAL(8,1),
  kraftstoff_liter DECIMAL(8,1),
  km_stand         INT,
  bemerkungen      TEXT,
  defekte          TEXT,
  foto_urls        TEXT[],
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS
ALTER TABLE geraete ENABLE ROW LEVEL SECURITY;
ALTER TABLE maschinen_protokoll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geraete_all" ON geraete
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "protokoll_all" ON maschinen_protokoll
  FOR ALL USING (auth.uid() IS NOT NULL);
