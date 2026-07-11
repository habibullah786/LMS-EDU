# How to Run the Project

## Frontend (Next.js)

```powershell
cd C:\Users\habib\Desktop\LMS-EDU\frontend
npm install
npm run dev
```

Runs on **http://localhost:3000**

---

## Backend (Laravel)

```powershell
cd C:\Users\habib\Desktop\LMS-EDU\backend-laravel
composer install
php artisan migrate
php artisan serve
```

Runs on **http://localhost:8000**

---

## First Time Setup (run once)

Seed the database with demo data and admin user:

```powershell
cd C:\Users\habib\Desktop\LMS-EDU\backend-laravel
php artisan db:seed --class=EnrollmentSeeder
```

---

## Admin Panel

URL: **http://localhost:3000/admin/login**

| Field    | Value            |
|----------|------------------|
| Email    | admin@lmsedu.com |
| Password | Password123!     |

---

## Orbund WordPress Integration

The trial enrollment flow on the WordPress site (exceedrobotics.com) mirrors data to our own API.

### Files to upload to WordPress

Located in `wordpress/trial-2-0/js/`:

| File | Step | What it does |
|------|------|--------------|
| `custom.js` | All | Defines `lms_api_url` — **update before going live** |
| `registration-detail.js` | Step 1 | Saves lead to `POST /api/leads` |
| `login.js` | Step 4 | Mirrors login/register to our auth endpoints |
| `checkout.js` | Step 5 | Saves enrollment to `POST /api/orbund/enrollment` |
| `billing.js` | Step 6 | Records payment to `POST /api/orbund/payment` |
| `thankyou.js` | Step 7 | Confirms enrollment via `PATCH /api/orbund/enrollment/{id}/confirm` |

WordPress PHP templates are in `wordpress/`.

### Before going live — update LMS API URL

In `wordpress/trial-2-0/js/custom.js`, change:

```js
var lms_api_url = "http://localhost:8000/api"
```

to your production Laravel API URL.

### New API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/leads` | Public | Capture trial registration lead (Step 1) |
| POST | `/api/orbund/enrollment` | Public | Save enrollment after Orbund (Step 5) |
| POST | `/api/orbund/payment` | Public | Record payment after Orbund (Step 6) |
| PATCH | `/api/orbund/enrollment/{id}/confirm` | Public | Mark enrollment confirmed on thank-you page (Step 7) |
| GET | `/api/leads` | Admin | List all leads in admin panel |
| PATCH | `/api/leads/{id}` | Admin | Update lead status/notes |

---

## Notes

- Run frontend and backend in **separate terminals** at the same time.
- Frontend calls the API at `http://localhost:8000/api` (configured in `frontend/.env.local`).
- `http://localhost:8000/` always returns 404 — backend has no homepage, only API routes.
- Health check: **http://localhost:8000/up**
- Run `npm install` and `composer install` only on first setup.
