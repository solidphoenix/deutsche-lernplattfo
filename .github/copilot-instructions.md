# Copilot instructions for this repository

This is a GitHub Spark/Vite React app for a German nursing exam learning platform. The UI and user-facing errors are mostly German. Keep changes small and preserve Spark-specific integration points.

## Project shape

- Main app: `src/App.tsx`
- Entry point: `src/main.tsx`
- Shared UI: `src/components/ui/` (shadcn/Radix-style components)
- Statistics UI: `src/components/StatisticsOverview.tsx`
- Domain data/helpers:
  - `src/lib/topics.ts` contains the 29 nursing exam topics.
  - `src/lib/pdf-loader.ts` maps available PDF learning situations in `src/assets/documents/`.
  - `src/lib/statistics.ts` calculates progress and topic mastery.
  - `src/lib/pdf-utils.ts` contains basic PDF text/story extraction helpers.
- Styling:
  - Tailwind CSS v4 with `@tailwindcss/vite`
  - CSS variables in `src/styles/theme.css`, `src/main.css`, and `src/index.css`
  - `tailwind.config.js` loads `theme.json` when present.

## Stack and conventions

- React 19, TypeScript, Vite, npm.
- The package is ESM (`"type": "module"`).
- Use the `@/*` import alias for `src/*`.
- Components are functional React components using hooks.
- App persistence uses GitHub Spark `useKV` from `@github/spark/hooks`; do not replace it with `localStorage` or a new backend unless asked.
- AI generation uses `window.spark.llm(...)`; keep defensive checks for `window.spark?.llm` and robust JSON parsing of LLM responses.
- Do not remove the Spark imports/plugins:
  - `import "@github/spark/spark"` in `src/main.tsx`
  - `createIconImportProxy()` and `sparkPlugin()` in `vite.config.ts`
- Prefer existing Radix/shadcn UI components and existing Tailwind/CSS-variable patterns.
- Keep German copy consistent for user-facing text.

## Useful commands

Run commands from the repository root.

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
npm run kill
```

Notes:

- Use `npm install` rather than `npm ci` unless the lockfile has been repaired. At onboarding time, `npm ci` failed because `package.json` and `package-lock.json` were out of sync.
- `npm run build` runs `tsc -b --noCheck && vite build`.
- There is no test framework configured in this repository.
- `npm run dev` serves the Vite app; `npm run kill` clears port 5000.

## Validation status observed during onboarding

- `npm ci` failed with lockfile/package mismatch, including `@github/spark` and missing Octokit packages.
  - Workaround used: `npm install`.
  - Do not commit lockfile changes from this workaround unless the task is explicitly to repair dependencies.
- `npm install` completed but reported a deprecated `lodash@4.18.0` override and `4 vulnerabilities (2 moderate, 2 high)`. Treat these as pre-existing dependency issues unless the task is about dependencies/security.
- `npm run build` succeeded.
  - It emitted Tailwind CSS optimization warnings around custom screen entries such as `(display-mode: standalone)`, `(pointer: coarse)`, and `(pointer: fine)` in generated container media queries.
- `npm run lint` failed because ESLint 9 could not find an `eslint.config.(js|mjs|cjs)` file.
  - Treat lint as currently unavailable until an ESLint flat config is added.

## Generated and ignored files

- Do not commit `node_modules/`, `dist/`, TypeScript build cache files, `.env`, or temporary agent reports.
- The repo declares npm workspaces for `packages/*`, but no tracked workspace packages were present during onboarding.
- Large PDF assets live under `src/assets/documents/`; avoid moving or renaming them without updating `src/lib/pdf-loader.ts`.

## When changing code

- For UI behavior, check affected flows in `src/App.tsx`: exam generation, preparation, exam, review, and statistics overview.
- For topic or PDF data changes, update the corresponding `src/lib/*` data file and any UI assumptions that reference IDs/counts.
- Keep error handling visible to users with existing toast patterns (`sonner`) and console details for debugging.
- If touching build or dependency setup, re-check `npm install`, `npm run build`, and the known lint limitation above.
