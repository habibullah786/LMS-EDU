# Email & SMS Notification Requirements
## Exceed Robotics LMS — SendGrid + Twilio Integration

---

## 1. Overview

Every key moment in the parent/student journey should trigger an automated notification.  
- **Email** via [SendGrid](https://sendgrid.com) — rich HTML templates, delivery tracking  
- **SMS** via [Twilio](https://twilio.com) — short plain-text messages for instant reach  

Notifications are sent from the **Laravel backend**, dispatched as **queued jobs** so they never block the HTTP response.

---

## 2. Trigger Events & Notifications

### 2.1 Lead Captured
*Triggered by:* `POST /api/leads` (WordPress form submit)

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | "Thanks for your interest — here's what happens next" |
| SMS | Parent | "Hi [name], we received your inquiry. We'll be in touch shortly. — Exceed Robotics" |
| Email | Admin | Internal alert: new lead with name, location, age group |

**Data available:** parent name, email, phone, age_group, location

---

### 2.2 User Registered
*Triggered by:* `POST /api/register/individual` or `/api/auth/register`

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | Welcome email — login link, dashboard link, next steps |
| SMS | Parent | "Welcome to Exceed Robotics! Log in at exceedrobotics.com to book your free trial." |

**Data available:** parent name, email, phone

---

### 2.3 Enrollment Created (Pending)
*Triggered by:* `POST /api/enrollments` or `POST /api/orbund/enrollment`

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | Booking summary — child name, class, location, date/time, instructor, price |
| SMS | Parent | "Booking received for [child] — [class] at [location]. We'll confirm shortly." |
| Email | Admin | New enrollment alert with full details |

**Data available:** parent name, email, phone; student name, DOB; class name, course, location, instructor, date/time, price, type (Trial/Paid)

---

### 2.4 Enrollment Confirmed
*Triggered by:* `PATCH /api/orbund/enrollment/{id}/confirm` or admin status → `confirmed`

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | ✅ Confirmation email — full class details, what to bring, directions |
| SMS | Parent | "Confirmed! [Child]'s [class] is set for [date] at [location]. See you there! — Exceed Robotics" |

**Data available:** all enrollment + student data

---

### 2.5 Payment Completed
*Triggered by:* `POST /api/payments/process` or `POST /api/orbund/payment`

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | Payment receipt — amount, transaction ID, class details |
| SMS | Parent | "Payment of $[amount] received for [child]'s enrollment. Receipt sent to [email]." |

**Data available:** parent name, email, phone; amount, currency, transaction ID, enrollment details

---

### 2.6 Class Reminder (Scheduled)
*Triggered by:* Scheduled Laravel job — **24 hours before** class date

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | Reminder — class tomorrow, location, time, what to bring |
| SMS | Parent | "Reminder: [Child]'s [class] is tomorrow at [time], [location]. See you there! 🤖" |

**Data available:** derived from Enrollment + ClassItem records

---

### 2.7 Enrollment Cancelled
*Triggered by:* Admin updates enrollment status → `cancelled`

| Channel | Recipient | Purpose |
|---------|-----------|---------|
| Email | Parent | Cancellation notice — reason (optional), offer to rebook |
| SMS | Parent | "Your booking for [child]'s [class] has been cancelled. Contact us to rebook." |

---

## 3. Email Template Designs

All emails share a consistent layout:

```
┌────────────────────────────────────┐
│  [Exceed Robotics logo]            │
│  exceedrobotics.com                │
├────────────────────────────────────┤
│  [Hero: subject-specific headline] │
├────────────────────────────────────┤
│  Hi [Parent Name],                 │
│                                    │
│  [Body content — dynamic]          │
│                                    │
│  [Primary CTA button]              │
├────────────────────────────────────┤
│  Questions? info@exceedrobotics.com│
│  © 2026 Exceed Robotics            │
└────────────────────────────────────┘
```

### SendGrid Dynamic Templates required:
| Template ID (to create) | Name |
|------------------------|------|
| `d-lead_received`      | Lead Received |
| `d-welcome`            | Welcome — Account Created |
| `d-enrollment_pending` | Enrollment Pending |
| `d-enrollment_confirmed` | Enrollment Confirmed |
| `d-payment_receipt`    | Payment Receipt |
| `d-class_reminder`     | Class Reminder |
| `d-enrollment_cancelled` | Enrollment Cancelled |
| `d-admin_new_enrollment` | Admin — New Enrollment Alert |

---

## 4. SMS Message Specs

- Max **160 characters** per message (single SMS unit)
- Sender: Twilio phone number (or alphanumeric Sender ID where supported)
- All messages end with `— Exceed Robotics` or brand sign-off
- **No sensitive data** (no payment card details, no passwords)
- Phone numbers stored in E.164 format: `+1XXXXXXXXXX`

---

## 5. Technical Architecture

### 5.1 Backend (Laravel)

```
app/
├── Services/
│   ├── NotificationService.php      ← orchestrates email + SMS
│   ├── SendGridService.php          ← SendGrid API wrapper
│   └── TwilioService.php            ← Twilio API wrapper
├── Jobs/
│   ├── SendEmailNotification.php    ← queued email job
│   ├── SendSmsNotification.php      ← queued SMS job
│   └── SendClassReminders.php       ← scheduled reminder job
├── Notifications/
│   ├── LeadReceived.php
│   ├── UserRegistered.php
│   ├── EnrollmentCreated.php
│   ├── EnrollmentConfirmed.php
│   ├── PaymentCompleted.php
│   ├── ClassReminder.php
│   └── EnrollmentCancelled.php
└── Console/Commands/
    └── SendDailyReminders.php       ← artisan command for scheduler
```

### 5.2 Queue
- Driver: **database** (simple, no Redis required to start)
- Failed jobs table for retry visibility
- Horizon (optional later) for monitoring

### 5.3 Scheduler (for reminders)
```php
// app/Console/Kernel.php
$schedule->command('notifications:send-reminders')->dailyAt('09:00');
```

---

## 6. Environment Variables Required

```env
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@exceedrobotics.com
SENDGRID_FROM_NAME="Exceed Robotics"
SENDGRID_ADMIN_EMAIL=admin@exceedrobotics.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1XXXXXXXXXX

# Queue
QUEUE_CONNECTION=database
```

---

## 7. Admin Controls (Future — Phase 2)

- Toggle each notification on/off per event
- Preview email template before sending
- View notification log (sent / failed / bounced)
- Re-send failed notifications manually
- Custom message templates per location

---

## 8. Dependencies

### PHP Packages
```bash
composer require sendgrid/sendgrid
composer require twilio/sdk
```

### Laravel built-ins used
- `Illuminate\Bus\Queueable`
- `Illuminate\Queue\SerializesModels`
- `Illuminate\Contracts\Queue\ShouldQueue`
- Laravel Scheduler (`artisan schedule:run`)

---

## 9. Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1** | SendGrid setup + Enrollment Confirmed email | ~1 day |
| **Phase 2** | Twilio setup + SMS for Confirmed + Pending | ~1 day |
| **Phase 3** | Welcome, Lead, Payment Receipt emails | ~1 day |
| **Phase 4** | Class Reminder scheduler (24h before) | ~1 day |
| **Phase 5** | Admin notification log + toggles | ~2 days |

---

## 10. Testing Checklist

- [ ] SendGrid sandbox mode — verify templates render correctly
- [ ] Twilio test credentials — verify SMS format and delivery
- [ ] Queue worker running: `php artisan queue:work`
- [ ] Reminder command: `php artisan notifications:send-reminders --dry-run`
- [ ] Failed job retries work correctly
- [ ] Phone number validation (E.164 format) before sending
- [ ] Email bounces/unsubscribes handled gracefully (don't crash)
- [ ] No notification sent if email/phone is null
