# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

LMS-EDU is Exceed Robotics' ed-tech platform: a Next.js 14 frontend and a Laravel 11 backend, integrated with the third-party **Orbund SIS** (student information system) for the free-trial enrollment funnel.

```
LMS-EDU/
├── frontend/           # Next.js 14 (App Router), TypeScript, Tailwind CSS
└── backend-laravel/    # Laravel 11 API, SQLite (dev)
```

### Backend (`backend-laravel/`)

- All routes are defined in `routes/api.php`, mounted under `/api`. There is no `routes/web.php` usage beyond Laravel's default welcome page.
- Auth is a **custom bearer-token scheme**, not Sanctum/Passport: `AuthController` issues a token stored in `users.remember_token`; `App\Http\Middleware\AuthenticateApiToken` reads the `Authorization: Bearer <token>` header and resolves the user by looking up that column directly. `App\Http\Middleware\EnsureAdmin` then checks `$user->isAdmin()` for admin-only routes (mounted under `admin/` prefix).
- Feature areas, each with its own controller: trial enrollment (`TrialConfigController`, `OrbundEnrollmentController`, `OrbundPaymentController`, `LeadController`), self-registration/course discovery (`RegistrationController`, `CourseController`, `PaymentController`, `WaitlistController`), and admin (`AdminController`, `CustomWorkflowController`, `WorkflowEventController`, `AttendanceController`, `SchoolClassController`, `TrialConfigAdminController`).
- Notifications go through `app/Services/SendGridService.php` (email) and `app/Services/TwilioService.php` (SMS), orchestrated by `app/Services/NotificationService.php`, and dispatched asynchronously via `app/Jobs/SendEmailNotification.php` / `SendSmsNotification.php` (queue driver is `sync` in `.env`, so jobs run inline unless changed). All sends are recorded in `notification_logs` (see `NotificationLog` model) — check that table when debugging "email/SMS didn't arrive" issues.
- `custom_workflows` + `workflow_events` (models `CustomWorkflow`, `WorkflowEvent`) drive an admin-configurable automation system — e.g. the 24-hour-before-class reminder is `app/Console/Commands/SendDailyReminders.php`, and `SendScheduledWorkflows.php` fires workflow-based notifications. These need the Laravel scheduler running (`php artisan schedule:run`, typically via cron/Task Scheduler) to fire automatically.
- Orbund SIS integration: config lives in `.env` under `ORBUND_*` (base URL, client ID/secret, campus/level/program ID mappings, trial semester ID). The free-trial booking flow is a 7-step wizard historically implemented in WordPress/jQuery against the Orbund API directly (see `free-trial-enrollment-flow-of-orbund.md` for the full step-by-step spec, request/response shapes, and the `campusType`/`programId`/`levelId` value tables) — the Laravel backend's `Orbund*` controllers mirror/persist pieces of that flow (leads, enrollment confirmation, payment recording) for the Next.js version of the funnel.
- No `tests/` directory exists yet — `phpunit`/`php artisan test` will not find anything to run until test files are added.

### Frontend (`frontend/`)

- Next.js 14 App Router. Route groups worth knowing:
  - `/` — public landing page; redirects authenticated users straight to `/parent/dashboard` (see `app/page.tsx` + `app/context/AuthContext.tsx`).
  - `/trial/*` — the trial booking funnel (cart, checkout, classes, login, billing, thankyou) against the Orbund-integrated backend endpoints.
  - `/parent/dashboard`, `/students` — parent-facing account/enrollment views.
  - `/admin`, `/admin/login`, `/admin/dashboard` — admin portal (enrollments, leads, classes, notification logs, workflow config UI).
- Auth state is managed by `app/context/AuthContext.tsx`: a token + user object are persisted to `localStorage` (`auth_token`, `user`). **Important**: if the real backend call fails (network error/fetch failure), `login`/`register` silently fall back to a **mock auth system** backed by `localStorage['mock_users']`, seeded with `parent@example.com` / `Password123!` and `admin@lmsedu.com` / `Password123!`. This means auth can appear to "work" even when the Laravel backend is unreachable — check the Network tab to tell real vs. mock auth apart.
- API base URL is `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (defaults to `http://localhost:8000/api` in this repo's `.env.local`, though some docs/comments reference `8002` — always check the actual `.env.local` value, not the docs, when debugging connectivity).

## Common commands

### Frontend (`cd frontend`)
```bash
npm install          # install deps
npm run dev           # start dev server — http://localhost:3000
npm run build         # production build
npm start             # run production build
npm run lint          # ESLint (next lint)
```

### Backend (`cd backend-laravel`)
```bash
composer install
php artisan migrate --seed        # create + seed SQLite DB (database/database.sqlite)
php artisan serve --port=8000     # start API — http://localhost:8000/api
php artisan db:seed --class=EnrollmentSeeder   # re-seed enrollments only
php artisan tinker                # interactive shell for querying models directly
```

There's a `setup.sh` in `backend-laravel/` that runs `composer install` + migrate + seed in one shot for first-time setup.

## Known gotcha: stale dev server processes

On Windows, `npm run dev` / `php artisan serve` processes left running after closing a terminal (instead of Ctrl+C) do **not** always release their port. Next.js will silently increment to the next free port (3001, 3002...) instead of erroring, and multiple stale `php artisan serve` processes will all attempt to bind :8000. Symptom: the app "won't load" even though a dev server appears to start successfully. Always stop servers with Ctrl+C, and if pages won't load, check for orphaned processes first:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='php.exe'" | Select-Object ProcessId, CommandLine
```
