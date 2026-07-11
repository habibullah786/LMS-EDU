# Parent Dashboard

File: `frontend/app/parent/dashboard/page.tsx`

Authenticated parent sees all their children's trial class enrollments.

Access at `http://localhost:3000/parent/dashboard`

## What It Shows

- Child name
- Class / curriculum name
- Location
- Date booked
- Status (confirmed / pending)

## Bug Fixes Applied

### Trial students not appearing

**Problem:** `EnrollmentController::index()` only loaded paid students (`enrollment_students` table). Trial students are in `trial_enrollment_students` — not loaded.

**Fix in `app/Http/Controllers/EnrollmentController.php`:**
```php
// Before
Enrollment::with('students')

// After
Enrollment::with(['students', 'trialStudents'])
```

### snake_case vs camelCase mismatch

**Problem:** Laravel API returns snake_case (`parent_email`, `trial_students`). Frontend was reading camelCase keys (`parentEmail`, `trialStudents`) — all undefined.

**Fix:** Dashboard maps both `students` (paid) and `trial_students` (trial) arrays using the snake_case keys from the API response.

### Status showing as "pending"

**Problem:** Free trial enrollments created as `pending`. Confirmation required a separate API call that could fail or arrive after the parent viewed the dashboard.

**Fix:** Backend auto-confirms when `total_amount = 0`. Enrollment is saved as `confirmed` immediately. See [04-trial-booking-flow.md](04-trial-booking-flow.md).

## Auth

Dashboard tries both `auth_token` and `lms_token`. Filters enrollments server-side by `parent_email` (snake_case from API).
