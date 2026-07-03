# Deutsche Lernplattform

Eine selbst hostbare Lernplattform für die Pflegefachassistenz. Die App erstellt aus einem ausgewählten Fallbeispiel ein mündliches Probeexamen mit **genau 9 Fragen** (3 leicht, 3 mittel, 3 schwer), bietet Vorbereitungs- und Prüfungsmodus und speichert Versuche für die Statistik.

## Architektur

- **Frontend:** React 19 + Vite + TypeScript + Tailwind
- **Backend:** Node.js + Express + TypeScript
- **Persistenz:** SQLite (`exams`, `attempts`)
- **Prüfungs-Agent:** Backend-Modul mit Provider-Abstraktion (`openai-compatible` oder `ollama`)
- **RAG:** Lernunterlagen aus `/knowledge` werden gechunkt, eingebettet und in einer lokalen SQLite-basierten Vektordatenbank gespeichert

## Projektstruktur

- `/src` – Frontend
- `/backend` – API, Prüfungs-Agent, Persistenz, PDF-Extraktion
- `/knowledge` – Ablage für Pflegefachassistenz-Lernunterlagen
- `/src/assets/documents` – die 8 Fallbeispiel-PDFs

## Voraussetzungen

- Node.js 22+
- npm 10+
- Optional: Ollama, wenn Sie lokal oder vollständig selbst gehostet generieren/einbetten möchten

## Lokale Entwicklung

### 1. Frontend installieren

```bash
npm install
```

### 2. Backend installieren

```bash
cd backend
npm install
```

### 3. Umgebung konfigurieren

```bash
cp .env.example .env
```

Passen Sie danach mindestens Ihren LLM-Zugang in `.env` an.

### 4. Lernunterlagen hochladen und indexieren

Legen Sie PDF-, Markdown- oder Textdateien in `/knowledge` ab.

```bash
cd backend
npm run ingest
```

Wenn `/knowledge` leer ist, funktioniert die Generierung weiterhin nur mit dem Fallbeispieltext und der Themenliste.

### 5. Backend starten

```bash
cd backend
npm run dev
```

### 6. Frontend starten

```bash
npm run dev
```

Standardmäßig sprechen Frontend und Backend über `VITE_API_BASE_URL=/api`. Für lokale getrennte Ports können Sie in `.env` z. B. `VITE_API_BASE_URL=http://localhost:3001/api` setzen.

## Builds

### Frontend

```bash
npm run build
```

### Backend

```bash
cd backend
npm run build
```

## Backend-Skripte

Im Ordner `/backend`:

- `npm run dev` – Entwicklungsserver mit Watch-Modus
- `npm run build` – TypeScript-Build
- `npm run start` – Startet den gebauten Server
- `npm run ingest` – Baut den Wissensindex aus `/knowledge` neu auf

## API-Endpunkte

- `GET /api/fallbeispiele`
- `POST /api/exams/generate`
- `GET /api/exams`
- `GET /api/exams/:id`
- `POST /api/attempts`
- `GET /api/attempts`
- `GET /api/health`

## Deployment

Eine komplette VM- und Hosting-Anleitung finden Sie in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Hinweis zur inhaltlichen Qualität

Die Fragen werden KI-gestützt erzeugt. Sie sollten vor einem verbindlichen Einsatz von einer Lehrkraft oder Praxisanleitung fachlich geprüft werden.
