---
name: Architecture decisions
description: SaaS-ready personal MVP — key decisions for user_id, services, and email flow
---

# SaaS-ready Architecture Decisions

## user_id strategy
- All DB tables have `user_id integer not null default 1`
- `getUserId(req)` helper returns DEFAULT_USER_ID=1 (future: decode from JWT/session)
- This is fully backward-compatible and requires no migration complexity.
**Why:** Client wants personal MVP now, SaaS later. Default 1 means zero runtime changes needed.

## Service layer
- All business logic lives in `artifacts/api-server/src/services/`
- Routes are thin: parse → call service → return
- Services: profile.service, matching.service, application.service, user.service
- Discovery: services/discovery/ with provider pattern
**Why:** Clean separation means adding auth/billing later only touches routes, not logic.

## Application flow (canonical)
1. `sendApplicationForJob(jobId, userId)` in application.service.ts
2. Validates profile, job, match≥85, recruiterEmail, duplicate, rate limit
3. Generates email via application-email.ts (HTML + text)
4. Attaches PDF if resume.file_path exists
5. Sends via mailer.ts (Brevo SMTP, TEST_MODE redirect)
6. Logs to email_logs, outbound_emails, applications, activity tables
**Why:** All email logic centralized — routes just call this one function.

## TEST_MODE
- `TEST_MODE=true` in env → redirects all emails to TEST_EMAIL
- Real recruiter email still stored in DB, only SMTP "to" is overridden
