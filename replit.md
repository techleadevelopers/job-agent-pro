# AI Job Agent

Um agente pessoal premium que encontra vagas, analisa match com o currículo e automatiza candidaturas.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/ai-job-agent run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS + Framer Motion
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle schema files (resume, preferences, jobs, applications, agent, activity)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/ai-job-agent/src/pages/` — React pages (onboarding + main app)
- `artifacts/ai-job-agent/src/components/` — Shared components (AppLayout, AnimatedBackground)

## Architecture decisions

- Contract-first: OpenAPI spec → codegen → typed hooks. Never hand-write API types.
- Onboarding flow is a 4-step wizard (curriculo → preferencias → analisando → vagas). The app detects no-resume state via 404 on GET /resume and redirects automatically.
- All text is in Portuguese.
- Framer Motion for all animations: stagger cards, page transitions, animated mesh gradient background.
- Design: white background + subtle animated blobs, glassmorphism cards, rounded-2xl, indigo primary.

## Product

- **Onboarding**: Upload currículo PDF → set job preferences → AI analyzes and finds matches
- **Início**: Dashboard with today's stats (vagas, candidaturas, entrevistas, ofertas) + activity feed + agent control
- **Vagas**: Browse and filter matched jobs, apply or ignore, view details in a side drawer with cover letter
- **Candidaturas**: Track all applications, update status (aplicada/entrevista/oferta/rejeitada)
- **Agente IA**: Toggle and control the automation agent, view daily stats
- **Histórico**: Full activity timeline
- **Configurações**: Edit resume skills and job preferences

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code.
- The `jobs/search` route is a no-op stub — in production this would trigger Selenium/Playwright.
- Resume upload simulates PDF parsing (extracts skills from raw text keywords).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
