# Notification System

Automated email + SMS using SendGrid and Twilio.

## Active Notifications

| Event | Who gets it | Channel | Subject |
|-------|------------|---------|---------|
| New Lead | Admin | Email | `[New Lead] - {Course}` |
| Booking Received | Admin | Email | `[Booking Received] - {ClassName}` |
| Booking Confirmed | Parent | Email + SMS | `[Booking Confirmed] - {ClassName}` |
| Class Reminder (24hr) | Parent | Email + SMS | `Reminder: {Child}'s class is tomorrow!` |
| User Registered | Parent | Email + SMS | `Welcome to Exceed Robotics!` |
| Booking Cancelled | Parent | Email + SMS | `Booking cancelled — {Child}` |

## Removed Notifications

| What was removed | Why |
|-----------------|-----|
| Parent email on lead submit | Too early — no class selected yet |
| Parent SMS on lead submit | Removed along with email |
| Parent email on enrollment created (pending) | Parent gets confirmed email instead |
| Parent SMS on enrollment created | Same reason |

## Key Files

| File | Purpose |
|------|---------|
| `app/Services/NotificationService.php` | All 6 triggers + custom workflow firing |
| `app/Services/SendGridService.php` | Sends email via SendGrid v3 HTTP API |
| `app/Services/TwilioService.php` | Sends SMS via Twilio Messages API |
| `app/Jobs/SendEmailNotification.php` | Queued job — dispatches email, logs result |
| `app/Jobs/SendSmsNotification.php` | Queued job — dispatches SMS, logs result |
| `app/Console/Commands/SendDailyReminders.php` | 24-hr reminder artisan command |
| `routes/console.php` | Scheduler — daily at 09:00 |

## Event → Controller mapping

| Controller | Event fired |
|-----------|------------|
| `LeadController::store()` | `lead_received` |
| `AuthController::register()` | `user_registered` |
| `OrbundEnrollmentController::store()` | `enrollment_created` |
| `OrbundEnrollmentController::store()` (free trial) | `enrollment_confirmed` |
| `OrbundEnrollmentController::confirm()` | `enrollment_confirmed` |

## Custom Workflows (DB-backed)

Table: `custom_workflows`. Admin creates/toggles/fires from `/admin → Workflows`.

`fireEventWorkflows(eventKey, data)` fires all active DB workflows for that event key.

## Credentials Setup

1. Get SendGrid API key from app.sendgrid.com → Settings → API Keys
2. Verify `admin@exceedrobotics.com` in SendGrid → Settings → Sender Authentication
3. Add credentials to `backend-laravel/.env`
4. Twilio credentials from console.twilio.com

## Testing

With dummy credentials, all notifications log as `skipped` in the notification logs table.
