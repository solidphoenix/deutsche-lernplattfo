# Copilot instructions for this repository

This repository is a self-hostable React + Vite frontend with a Node.js + Express backend for a German nursing-exam learning platform. User-facing copy and errors should stay mostly in German.

## Project shape

- Frontend entry point: `src/main.tsx`
- Main frontend flow: `src/App.tsx`
- Shared UI: `src/components/ui/`
- Statistics UI: `src/components/StatisticsOverview.tsx`
- Frontend domain helpers:
  - `src/lib/topics.ts` contains the 29 exam topics
  - `src/lib/statistics.ts` calculates progress and mastery
  - `src/lib/api.ts` talks to the backend API
- Backend:
  - `backend/src/index.ts` starts the API and serves the built frontend
  - `backend/src/agent/` contains the Prüfungs-Agent, provider abstraction, and RAG pipeline
  - `backend/src/services/pdf.ts` extracts Fallbeispiel text from the server side
- Study material folder: `knowledge/`
- Deployment files: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `DEPLOYMENT.md`

## Stack and conventions

- Frontend: React 19, TypeScript, Vite, Tailwind v4, shadcn/Radix UI components, `sonner`, `framer-motion`
- Backend: Node.js, TypeScript, Express, SQLite via `better-sqlite3`
- Use the `@/*` alias for frontend imports inside `src/`
- Keep changes small, preserve the exam flow, and keep error handling visible to users
- Keep the 29-topic taxonomy from `src/lib/topics.ts` aligned with question generation and statistics

## Useful commands

From the repository root:

```bash
npm install
npm run dev
npm run build
npm run lint
```

From `/backend`:

```bash
npm install
npm run dev
npm run build
npm run start
npm run ingest
```

## Validation notes

- There is currently no dedicated test framework configured in this repository.
- Frontend and backend builds should both pass after code changes.
- If you change deployment or environment handling, re-check `docker-compose.yml`, `.env.example`, and `DEPLOYMENT.md` together.
