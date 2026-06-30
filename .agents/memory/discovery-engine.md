---
name: Job Discovery Engine
description: Multi-source job discovery providers and their characteristics
---

# Job Discovery Engine

## Providers (in ProviderManager)
1. **CatalogProvider** — static catalog, ~35 companies, all with real hr_email, always available
2. **RemoteOKProvider** — `https://remoteok.com/api?tags=<skill>` — free, no API key, returns JSON
3. **RemotiveProvider** — `https://remotive.com/api/remote-jobs?category=software-dev&search=<skills>` — free, no API key, returns JSON

## Location filtering
- Country field on jobs: BR, ES, PT, EU, GLOBAL
- `filterLocationIfNeeded()` in provider-manager.ts maps location strings to country codes
- Frontend tabs: Brasil / Europa / Global

## Contact priority ranking
- "high" = has hr_email (direct contact)
- "medium" = has url (form-based)
- "low" = no contact

## Email validation
- Recruitment emails scored in email-extractor.ts
- Pattern: rh@, recrutamento@, careers@, jobs@, talent@, hiring@, people@, hr@
- Ignored: suporte@, contato@, noreply@, financeiro@, comercial@

## Deduplication
- Key: `company|title` (lowercase, trimmed)
- Runs after all providers complete

**Why:** Free APIs (RemoteOK, Remotive) give real job data without needing paid keys. Future: add Google/Bing/SerpAPI providers when keys are available.
