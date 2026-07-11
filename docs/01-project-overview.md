# Project Overview

Full-stack LMS for Exceed Robotics (exceedrobotics.com). Kids take Robotics or Coding classes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Laravel 11, MySQL/SQLite |
| SIS | Orbund (exceed.orbundsis.com) |
| Email | SendGrid |
| SMS | Twilio |

- Frontend runs at `http://localhost:3000`
- Backend runs at `http://localhost:8000`

## Architecture

```
Next.js (frontend/)
        ↓
Laravel API (backend-laravel/)
        ↓
Orbund SIS (external)
```

Frontend never talks to Orbund directly — always through Laravel.

## API Endpoints

Base URL: `http://localhost:8000/api` (set via `NEXT_PUBLIC_API_URL`)

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | — | Login |
| POST | `/auth/register` | — | Register |
| POST | `/auth/logout` | token | Logout |
| GET | `/auth/me` | token | Get current user |
| PUT | `/auth/me` | token | Update profile |
| PUT | `/auth/change-password` | token | Change password |

### Trial Booking Flow

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/trial/config` | — | Locations, age groups, semester |
| GET | `/trial/classes` | — | Available trial classes |
| POST | `/leads` | — | Create lead (step 1) |
| POST | `/trial/enrollment` | — | Save enrollment (step 4) |
| PATCH | `/trial/enrollment/{id}/confirm` | — | Confirm enrollment |
| POST | `/trial/payment` | — | Record payment |

### Courses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/courses` | — | List all courses |
| GET | `/courses/{courseId}` | — | Get course |
| GET | `/courses/{courseId}/classes` | — | Available classes for course |
| GET | `/courses/by-location/{location}` | — | Courses by location |
| GET | `/courses/by-age-group/{ageGroup}` | — | Courses by age group |
| GET | `/courses/programs` | — | List programs |
| GET | `/courses/departments` | — | List departments |
| GET | `/courses/filter-options` | — | Filter options |

### Enrollments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/enrollments` | — | List enrollments |
| POST | `/enrollments` | — | Create enrollment |
| GET | `/enrollments/{id}` | — | Get enrollment |
| PUT | `/enrollments/{id}` | — | Update enrollment |
| DELETE | `/enrollments/{id}` | — | Delete enrollment |
| GET | `/enrollments/stats` | — | Enrollment stats |
| GET | `/enrollments/filter-options` | — | Filter options |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/create/{enrollmentId}` | — | Create payment |
| POST | `/payments/process` | — | Process payment |
| GET | `/payments/{paymentId}` | — | Get payment |
| GET | `/payments/user/list` | token | User payment history |

### Waitlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/waitlist/class/{classId}` | — | Class waitlist |
| GET | `/waitlist/user` | token | User's waitlist entries |
| DELETE | `/waitlist/{id}` | token | Remove from waitlist |
| POST | `/waitlist/{id}/approve` | admin | Approve entry |
| GET | `/waitlist/stats` | admin | Waitlist stats |

### Leads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/leads` | admin | List all leads |
| PATCH | `/leads/{lead}` | admin | Update lead |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/enrollments` | Enrollments list |
| GET | `/admin/enrollments/stats` | Enrollment stats |
| GET | `/admin/enrollments/filter-options` | Filter options |
| GET | `/admin/users` | All users |
| GET | `/admin/notification-logs` | Notification logs |
| GET | `/admin/workflows` | List workflows |
| POST | `/admin/workflows` | Create workflow |
| PATCH | `/admin/workflows/{id}` | Update workflow |
| DELETE | `/admin/workflows/{id}` | Delete workflow |
| POST | `/admin/workflows/{id}/fire` | Trigger workflow |
| GET | `/admin/classes` | List classes |
| POST | `/admin/classes` | Create class |
| DELETE | `/admin/classes/{id}` | Delete class |
| GET | `/admin/trial-config/locations` | Trial locations |
| POST | `/admin/trial-config/locations` | Create location |
| DELETE | `/admin/trial-config/locations/{id}` | Delete location |
| GET | `/admin/trial-config/age-groups` | Trial age groups |
| POST | `/admin/trial-config/age-groups` | Create age group |
| DELETE | `/admin/trial-config/age-groups/{id}` | Delete age group |

### Registration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/individual` | Individual registration |
| POST | `/register/batch` | Batch/group registration |

### Orbund SIS (External — `https://exceed.orbundsis.com/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/session-id` | Get session |
| GET | `/cart/filter/semester` | Semesters |
| GET | `/cart/multiple/program-list-with-courses` | Classes list |
| POST | `/cart/multiple/display-cart` | Display cart |
| POST | `/cart/registration/multiple/contact/login` | Orbund login |
| POST | `/cart/registration/multiple/contact/register` | Orbund register |
| POST | `/cart/registration/multiple/contact/save-group-enrollment` | Save enrollment |
| GET | `/cart/payment/multiple/collect-payment-info` | Payment info |
| POST | `/cart/payment/multiple/class-invoice-installments` | Payment plan |
| GET | `/cart/payment/multiple/billing-info` | Billing info |
| GET | `/public/states` | States list |
| POST | `/cart/payment/multiple/process-payment` | Process payment |
| GET | `/cart/multiple/thankyou` | Thank you page |

## Trial Booking Flow (7 steps)

| Step | URL | What happens |
|------|-----|-------------|
| 1 | `/trial` | Parent fills form → lead saved |
| 2 | `/trial/classes` | Parent picks class date/time |
| 3 | `/trial/cart` | Review cart |
| 4 | `/trial/login` | Auth (login or register) → enrollment saved |
| 5 | `/trial/checkout` | Payment (free trials skip this) |
| 6 | `/trial/thankyou` | Confirmation + print |

## Auth Tokens (two-token system)

| Token | Used by |
|-------|---------|
| `lms_token` | Trial flow (login/register in trial) |
| `auth_token` | AuthContext (parent/admin dashboard) |
| `user` localStorage | AuthContext caches full user object here |

`lmsApi.me()` checks `user` localStorage first, then falls back to API token call.

## Key localStorage / sessionStorage Keys

| Key | Storage | Holds |
|-----|---------|-------|
| `cartStudents` | sessionStorage | Students with class selections, `_date`, `_time` |
| `trial_registration` | localStorage | Parent info from step 1 |
| `lms_enrollment_id` | localStorage | Guards against duplicate enrollment saves |
| `lms_lead_id` | localStorage | Lead ID from step 1 |
| `lms_token` | localStorage | Trial-flow auth token |
| `auth_token` | localStorage | AuthContext auth token |
| `user` | localStorage | Full user object (AuthContext) |

## .env (backend-laravel/.env)

```env
SENDGRID_API_KEY=SG.your_real_key
SENDGRID_FROM_EMAIL=admin@exceedrobotics.com
SENDGRID_ADMIN_EMAIL=habib.a@exceedvirtual.com
QUEUE_CONNECTION=sync
TWILIO_ACCOUNT_SID=ACyour_real_sid
TWILIO_AUTH_TOKEN=your_real_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

`QUEUE_CONNECTION=sync` — jobs run inline, no `php artisan queue:work` needed.

`admin@exceedrobotics.com` must be verified as Sender Identity in SendGrid → Settings → Sender Authentication.
