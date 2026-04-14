# MeLe – Baustellenmanager

Mobile-first Web-App für Straßenbauunternehmen.

## Stack

- **Frontend:** React + Vite + React Router
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **PWA:** vite-plugin-pwa (offline-fähig)

## Module

| Route | Seite | Beschreibung |
|-------|-------|--------------|
| `/dashboard` | Dashboard | Überblick: aktive Baustellen, offene Aufgaben |
| `/baustellen` | Baustellen | Baustellen anlegen & verwalten |
| `/zeiterfassung` | Zeit | Arbeitsstunden erfassen |
| `/tagesberichte` | Berichte | Tägliche Baustellenberichte |
| `/planung` | Planung | Wochenplanung / Mitarbeiter einteilen |
| `/aufgaben` | Aufgaben | Mängel & Aufgaben mit Priorität |

## Setup

### 1. Supabase vorbereiten

1. Neues Projekt auf [supabase.com](https://supabase.com) erstellen
2. SQL aus `supabase/schema.sql` im SQL-Editor ausführen
3. URL und Anon-Key kopieren

### 2. Umgebungsvariablen

```bash
cp .env.example .env
# .env befüllen mit deinen Supabase-Werten
```

### 3. Installieren & starten

```bash
npm install
npm run dev
```

### 4. Ersten Nutzer anlegen

Im Supabase Dashboard unter **Authentication → Users** einen Nutzer anlegen, danach in der `profiles`-Tabelle Vorname, Nachname und Rolle setzen.

## Build & Deploy

```bash
npm run build
# dist/ Ordner deployen (Netlify, Vercel, etc.)
```
