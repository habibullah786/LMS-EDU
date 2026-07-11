# Orbund Continuing Education Page — Analysis vs. Current LMS

## Source
- Page: https://orbund.com/continuing-education/
- Fetched: 2026-07-11

Orbund is the external SIS this LMS already integrates with (`exceed.orbundsis.com`) for the trial booking flow — see `free-trial-enrollment-flow-of-orbund.md`. This page is Orbund's own marketing page for a *different* module of their product: **Continuing Education**. Below is the full feature list as published on the page, followed by a bullet-by-bullet comparison against what already exists in this codebase.

---

## 1. Full Feature List (as published)

**Seamless Self-Registration**
- Individual or Group registration
- Course listing by program, location or department
- Batch register large groups
- Automatic enrollment with payment or enroll into a waitlist that is manually approved

**Secure E-commerce Experience**
- Offer payment plans
- Payment via credit card, invoice, or purchase orders
- Fully-customizable post-purchase and post-registration communication

**Easy Curriculum Management**
- Digital credentialing
- Easily organize and update course offerings
- Corporate portal to facilitate employee registration
- Create custom course structures to meet specific education needs and goals
- Integrate course schedules with academic calendars, simplifying planning and execution

**Reports & Automation**
- Receive daily reports of new registrations
- Create custom reports to meet specific needs of programs
- Automate the entire process from self-registration to payments
- Automatically send welcome messages and instructions to new registrants
- Automate routine administrative tasks like enrollment processing, attendance tracking, and invoice generation

**Marketing Campaigns**
- SMS campaigns
- Offer Coupons
- Email campaigns
- Customize with your branding
- Hide or show sold out classes
- Customizable forms for lead generation

**Technology**
- Mobile friendly portals
- SOC 2 type 2 certified
- User support & training
- Secure payment processing
- Data Encryption at rest & transmission

---

## 2. Bullet-by-Bullet Comparison

### Seamless Self-Registration
| Feature | Status | Notes |
|---|---|---|
| Individual or Group registration | Partial | `Enrollment.registration_type` (individual/batch) + `group_reference_id` already exist in schema — [Enrollment.php](backend-laravel/app/Models/Enrollment.php#L20-L23). No public frontend page lets a parent actually do this for a Paid class today. |
| Course listing by program, location or department | Legacy only | `CourseController` supports filtering by `program_id`, `department_id`, `age_group` — but this queries the old, disconnected `Course`/`Department` models, not the live `school_classes` table, and has no frontend page. |
| Batch register large groups | Partial | `RegistrationController::registerBatch` exists but again targets the disconnected legacy `Course`/`CourseClass` schema, not `school_classes`. Not usable for real Paid classes as-is. |
| Auto-enroll or manually-approved waitlist | Partial | `WaitlistController::approveWaitlistEntry` already implements manual admin approval → creates an `Enrollment` on approval — [WaitlistController.php](backend-laravel/app/Http/Controllers/WaitlistController.php#L55-L123). But the underlying `Waitlist` model is tied to the legacy `CourseClass`, not `SchoolClass`, so it doesn't apply to the classes admins actually create today. |

### Secure E-commerce Experience
| Feature | Status | Notes |
|---|---|---|
| Payment plans | Missing | No installment/payment-plan concept anywhere in the schema. `Payment` is a single amount/status record. |
| Credit card, invoice, or PO payment | Partial | `Payment.payment_method` field exists and can hold any string, but no live gateway is integrated in Laravel — real card charges for paid trial conversions happen on Orbund's own hosted billing pages, and `OrbundPaymentController` just records the result afterward. No invoice/PO workflow exists. |
| Customizable post-purchase/post-registration communication | Partial | `CustomWorkflow`/`WorkflowEvent`/`NotificationLog` already support configurable triggered email+SMS (used today for trial reminders) — the mechanism exists, but nothing is currently configured for a post-registration/post-purchase message. |

### Easy Curriculum Management
| Feature | Status | Notes |
|---|---|---|
| Digital credentialing | Missing | No certificate/credential feature exists anywhere in the codebase. |
| Organize and update course offerings | Have | `SchoolClass` (curriculum, course, age_groups, semester, locations, price, capacity) is live, and the admin dashboard already has full create/list/delete for classes. |
| Corporate portal for employee registration | Missing | No corporate/B2B registration concept exists. |
| Custom course structures | Partial | `SchoolClass` fields are fairly generic/flat; no structured "program → course → level" hierarchy is live (that hierarchy only exists in the disconnected legacy `Program`/`Course` models). |
| Integrate course schedules with academic calendars | Missing | No calendar integration exists. |

### Reports & Automation
| Feature | Status | Notes |
|---|---|---|
| Daily reports of new registrations | Missing | No scheduled reporting job exists. The workflow engine (`CustomWorkflow` with `scheduled_at`) could support this pattern, but no such report is configured today. |
| Custom reports for specific program needs | Partial | `EnrollmentController::stats` / `AdminController::stats` provide some aggregate stats (totals, revenue, locations, courses) but nothing configurable/custom. |
| Automate entire process from registration to payment | Missing | No end-to-end automation exists for Paid classes since there's no live registration flow or gateway yet. |
| Automatic welcome messages to new registrants | Partial | Same workflow mechanism as above (`CustomWorkflow`) — capable of this, not yet configured for it. |
| Automate enrollment processing, attendance tracking, invoice generation | Partial | Attendance tracking already exists (`AttendanceController`, mark attended/no-show + email no-shows). Enrollment processing is manual/API-driven, not automated. No invoice generation exists. |

### Marketing Campaigns
| Feature | Status | Notes |
|---|---|---|
| SMS campaigns | Partial | `CustomWorkflow.sms_enabled`/`sms_body` already supports one-off SMS via Twilio (per notification system docs) — usable as a basis for a "campaign," but no batch/segmented campaign concept exists yet. |
| Coupons | Missing | No coupon/discount-code model exists anywhere in the codebase. |
| Email campaigns | Partial | Same as SMS — `CustomWorkflow.email_enabled`/`email_body` via SendGrid exists per-workflow, not as a batch campaign tool. |
| Custom branding | Have (elsewhere) | Branding is handled at the site/frontend level (exceedrobotics.com), not inside the LMS admin — not really an LMS gap, more a marketing-site concern. |
| Hide/show sold-out classes | Missing | `school_classes.available_slots` is tracked and editable by admins, but no grep found sold-out-hiding logic in the admin dashboard or any public listing (no public Paid-class listing exists at all yet). |
| Customizable lead-generation forms | Have | `Lead` model/`LeadController` already capture leads with `source`/`page_url` — the trial form is a working example of this pattern. |

### Technology
| Feature | Status | Notes |
|---|---|---|
| Mobile-friendly portals | Have | Frontend is a responsive Next.js app. |
| SOC 2 Type 2 certified | N/A | This is a compliance certification of Orbund's own hosting/operations — not something applicable to "have/missing" for this codebase; would require a separate audit process if ever pursued. |
| User support & training | N/A | Organizational/operational offering, not a codebase feature. |
| Secure payment processing | Missing (for native payments) | No native payment gateway is integrated; whatever security posture exists today is inherited from Orbund's hosted billing pages for the trial-paid flow. |
| Data encryption at rest & in transit | Partial | HTTPS/TLS in transit is standard for the deployed app; no explicit at-rest encryption configuration was found in this codebase (would depend on hosting/DB configuration, not app code). |

---

## 3. Note on a Separate, Unused Prototype

A disconnected "Self-Registration" system exists in this codebase, documented in `SELF_REGISTRATION_IMPLEMENTATION.md` and `SELF_REGISTRATION_API.md`:
- Models: `Program`, `Department`, `Course`, `CourseClass`, `Waitlist` (tied to `CourseClass`, not `SchoolClass`), `Payment` (shared model).
- Controllers: `RegistrationController`, `CourseController`, `WaitlistController` — all routed in `api.php` (`/register/individual`, `/register/batch`, `/courses/*`, `/waitlist/*`).
- Targets India-market sample data (Delhi, Bengaluru, Kolkata; Razorpay/INR) and is **not wired to any frontend page** — no `/register` or `/courses` pages exist in `frontend/app/`.
- Several "Have/Partial" items above (course listing filters, batch registration, waitlist approval) technically exist in code, but only in this disconnected prototype — they don't operate on the real, live `school_classes`/`Enrollment` data admins actually use.

---

## 4. Summary

| Status | Count (of ~27 bullets) |
|---|---|
| Have | 4 |
| Partial (exists but incomplete, or only in the disconnected legacy prototype) | 13 |
| Missing | 9 |
| N/A (compliance/operational, not a code feature) | 2 |

The overall picture: individual pieces of infrastructure (workflows/notifications, attendance tracking, lead capture, a Paid class type, waitlist approval logic) already exist and cover a meaningful fraction of what Orbund's Continuing Education page advertises — but they are split across a *live* system (`school_classes`/`Enrollment`/`CustomWorkflow`) and a *disconnected legacy prototype* (`Course`/`CourseClass`/`Program`), and there is no public frontend flow today that lets a parent actually browse and register into a Paid, ongoing class.
