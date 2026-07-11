# LMS-EDU — Implementation Reference

Full-stack LMS for Exceed Robotics. Next.js 14 frontend + Laravel 11 backend + Orbund SIS integration.

---

## Quick Start

### Backend (Laravel 11)

```bash
cd backend-laravel

composer install
php artisan migrate --seed
php artisan serve --port=8002

# Queue worker (required for email/SMS delivery)
php artisan queue:work
```

API available at: **http://localhost:8002/api**

### Frontend (Next.js 14)

```bash
cd frontend

npm install
npm run dev
```

App available at: **http://localhost:3000**

---

## Project Structure

```
LMS-EDU/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                      Root layout with AuthProvider
│   │   ├── page.tsx                        Landing page (hero, features, CTA)
│   │   ├── globals.css                     Tailwind setup + custom components
│   │   ├── context/AuthContext.tsx         Auth state management (useAuth hook)
│   │   ├── components/
│   │   │   ├── Navigation.tsx              Sticky header, auth-aware menu
│   │   │   └── LoginModal.tsx              Login & Register modal (2-tab)
│   │   ├── admin/
│   │   │   ├── page.tsx                    Admin portal (enrollments, notifications, workflows)
│   │   │   └── login/page.tsx             Admin login with role verification
│   │   ├── search/page.tsx                 Class search with filters + cart
│   │   ├── cart/page.tsx                   Shopping cart
│   │   ├── checkout/page.tsx               Payment + parent details
│   │   ├── enrollments/page.tsx            Parent enrollment history
│   │   ├── dashboard/page.tsx              Parent dashboard
│   │   ├── students/page.tsx               Student profiles
│   │   ├── thank-you/page.tsx              Booking confirmation
│   │   └── trial/classes/page.tsx          Orbund trial class selection
│   ├── lib/
│   │   ├── api/enrollments.ts              Enrollment API client
│   │   └── orbund.ts                       Orbund SIS API client
│   ├── .env.local                          NEXT_PUBLIC_API_URL
│   └── tailwind.config.js                  Theme (primary blue, secondary orange)
│
└── backend-laravel/
    ├── app/
    │   ├── Models/
    │   │   ├── User.php                    Parent / admin roles
    │   │   ├── Enrollment.php
    │   │   ├── Lead.php
    │   │   ├── NotificationLog.php         Immutable send log
    │   │   └── CustomWorkflow.php          Admin-created workflow definitions
    │   ├── Services/
    │   │   ├── NotificationService.php     Orchestrates all notifications
    │   │   ├── SendGridService.php         SendGrid v3 via Http facade
    │   │   └── TwilioService.php           Twilio Messages API via Http facade
    │   ├── Jobs/
    │   │   ├── SendEmailNotification.php   Queued email job
    │   │   └── SendSmsNotification.php     Queued SMS job
    │   └── Http/Controllers/
    │       ├── AdminController.php
    │       ├── AuthController.php
    │       ├── LeadController.php
    │       ├── OrbundEnrollmentController.php
    │       ├── CustomWorkflowController.php
    │       └── EnrollmentController.php
    ├── database/migrations/               SQLite migrations
    ├── routes/
    │   ├── api.php                        All API routes
    │   └── console.php                    Scheduled commands (Laravel 11 style)
    ├── config/services.php                SendGrid + Twilio config
    └── .env                               Credentials + queue config
```

---

## Database Schema

### Core tables

| Table | Key fields |
|-------|-----------|
| `users` | id, name, email, password, role (parent\|admin), phone, remember_token |
| `enrollments` | id, user_id, parent_name, parent_email, parent_phone, total_amount, status (pending\|confirmed\|cancelled), booking_date, orbund_enrollment_id, lead_id |
| `leads` | id, name, email, phone, age_group, orbund_program_id, location, source, status |
| `orbund_enrollment_students` | id, enrollment_id, orbund_class_id, first_name, last_name, date_of_birth, location, course, price |

### Notification tables

| Table | Key fields |
|-------|-----------|
| `notification_logs` | id, type (email\|sms), event, recipient, subject, status (sent\|failed\|skipped), error_message, created_at (no updated_at) |
| `custom_workflows` | id, name, description, trigger_type (manual\|event), event_key, email_enabled, email_recipient (parent\|admin\|both), email_subject, email_body, sms_enabled, sms_recipient, sms_body, active, timestamps |

---

## API Endpoints

### Auth

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout          (Bearer token required)
GET    /api/auth/me              (Bearer token required)
PUT    /api/auth/me
PUT    /api/auth/change-password
```

### Orbund / WordPress integration (public)

```
POST   /api/leads                             Capture lead (step 1)
POST   /api/orbund/enrollment                 Save enrollment after Orbund (step 5)
PATCH  /api/orbund/enrollment/{id}/confirm    Confirm after thank-you page (step 7)
POST   /api/orbund/payment                    Record payment (step 6)
```

### Enrollments (public)

```
GET    /api/enrollments
POST   /api/enrollments
GET    /api/enrollments/{id}
PUT    /api/enrollments/{id}
DELETE /api/enrollments/{id}
GET    /api/enrollments/stats
GET    /api/enrollments/filter-options
```

### Admin (Bearer token + admin role required)

```
GET    /api/admin/enrollments
GET    /api/admin/enrollments/stats
GET    /api/admin/enrollments/filter-options
GET    /api/admin/users
GET    /api/leads
PATCH  /api/leads/{lead}

GET    /api/admin/notification-logs
GET    /api/admin/workflows
POST   /api/admin/workflows
PATCH  /api/admin/workflows/{workflow}
DELETE /api/admin/workflows/{workflow}
POST   /api/admin/workflows/{workflow}/fire

GET    /api/admin/orbund-classes
GET    /api/admin/orbund-classes/semesters
POST   /api/admin/orbund-classes/sync
```

---

## Notification System

### How it works

1. A controller action fires (lead captured, user registers, enrollment created/confirmed)
2. Controller calls `NotificationService::fireEventWorkflows('event_key', $data)` — queries DB for matching active custom workflows and dispatches them
3. Controller also calls the matching built-in method (e.g. `enrollmentCreated(...)`)
4. Both paths dispatch `SendEmailNotification` and/or `SendSmsNotification` queued jobs
5. Jobs call `SendGridService` / `TwilioService`, then write a row to `notification_logs`

### Event keys wired

| Event key | Fired from |
|-----------|-----------|
| `lead_received` | `LeadController::store()` |
| `user_registered` | `AuthController::register()` |
| `enrollment_created` | `OrbundEnrollmentController::store()` |
| `enrollment_confirmed` | `OrbundEnrollmentController::confirm()` |

### Credentials (replace dummies before going live)

```env
QUEUE_CONNECTION=database

SENDGRID_API_KEY=SG.dummy_replace_with_real_key
SENDGRID_FROM_EMAIL=noreply@exceedrobotics.com
SENDGRID_FROM_NAME="Exceed Robotics"
SENDGRID_ADMIN_EMAIL=admin@exceedrobotics.com

TWILIO_ACCOUNT_SID=ACdummy_replace_with_real_sid
TWILIO_AUTH_TOKEN=dummy_replace_with_real_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

Services skip silently with dummy credentials and log status as `skipped`.

### Scheduled command

```bash
php artisan notifications:send-reminders   # runs daily at 09:00 via routes/console.php
```

---

## Admin Portal

Single page at `/admin` with a TalentLMS-style sidebar. Views:

| View | What it does |
|------|-------------|
| `dashboard` | Stats overview |
| `leads` | Lead management |
| `enrollments` | Enrollment list + filters |
| `classes` | Manage classes shown on /search (localStorage `lmsedu_search_data`) |
| `settings` | Locations, courses, age groups config |
| `notifications` | Notification log table (type/event/status filters) |
| `workflows` | Built-in workflow toggles + custom workflow CRUD + Send Now |

Custom workflows are saved to the `custom_workflows` DB table. Event-based ones auto-fire via `fireEventWorkflows()`. Manual ones are triggered via the "Send Now" button (calls `POST /api/admin/workflows/{id}/fire`).

---

## Frontend: Class Search (`/search`)

- Reads classes from localStorage key `lmsedu_search_data` (populated via admin `/admin` → Classes view)
- Filter pills: Location / Age Group / Course / **Type** (All · Trial · Paid)
- All class types shown by default — admin controls what's available

---

## Design Tokens

| Token | Value |
|-------|-------|
| Primary | `#0066FF` (blue) |
| Secondary | `#FF6B35` (orange) |
| Accent | `#FFB627` (yellow) |
| Background | `#F5F7FA` |

CSS utilities: `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.input-field`, `.section-container`, `.text-gradient`

---

## Maintenance Commands

```bash
# Database
php artisan migrate
php artisan migrate:rollback
php artisan migrate --seed

# Cache
php artisan cache:clear
php artisan route:list

# Queue
php artisan queue:work
php artisan queue:failed

# Notifications
php artisan notifications:send-reminders --dry-run
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lmsedu.com | Password123! |
| Parent | parent@example.com | Password123! |
