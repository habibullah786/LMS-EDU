# Exceed Robotics: Actions and Data Capture

**Document status:** Draft for business and development review  
**Last updated:** August 17, 2026  
**Related document:** `lead-to-enrolled.md`

## Implementation Status

The documented lead and conversion actions are implemented through the admin Lead Pipeline and protected Laravel endpoints. All mutations require backend permissions and record lifecycle/activity data. Nurture steps only schedule when the relevant marketing consent exists. Online payments remain provider-verified; manual front-desk/admin-call payments require an authorized staff record and receipt/reference. Orbund supports queued API sync, retry, failure visibility, and manual confirmation fallback.

## 1. Purpose

This document defines the user-facing actions, automated triggers, responsible actors, required data, and expected database effects for the lead-to-enrollment workflow.

## 2. Stage Actions

| Stage | Action / button | Type | Triggered by | Data captured | Expected effect |
|---|---|---|---|---|---|
| Lead Received | Create Lead Record | Automated | System | Parent and student details, contact data, interest, source, consent, timestamp | Creates Lead; status becomes `lead_received` |
| Lead Received | Send Confirmation Email | Automated | System | Notification event and delivery metadata | Sends transactional inquiry confirmation; logs attempt/result |
| Post-Registered | Log Call | Manual | Phone Admin | Call time, outcome, notes, next follow-up | Creates Call/Activity row; may update status or `next_call_due_at` |
| Post-Registered | Mark as Spam | Manual | Admin | Spam flag and required reason | Status becomes `dropped_spam`; suppresses automation |
| Post-Registered | Mark as Duplicate | Manual / automated suggestion | Admin / matching service | Canonical Lead ID, match basis, reviewer | Links/merges duplicate; prevents duplicate outreach |
| Post-Registered | Book Trial | Manual / self-service | Admin / Parent | Class, date/time, location, program, student(s), booking source | Creates Trial; Lead moves to `pre_registered` |
| Pre-Registered | Send Trial Confirmation | Automated | System | Notification event and delivery metadata | Sends date, time, location, and calendar link; logs delivery |
| Pre-Registered | Verify Trial Slot | Manual | Admin | Capacity check, roster verification, verifier, timestamp | Trial becomes scheduled/verified |
| Trial Class Scheduled | Send Reminder | Automated | Scheduler | Trial ID and scheduled reminder key | Sends reminder approximately 24 hours before class; logs delivery |
| Trial Class Scheduled | Reschedule Trial | Manual | Admin / Parent | New class/date/time, reason, actor | Updates Trial; invalidates old reminder and schedules replacement |
| Trial Class Scheduled | Mark Attendance | Manual | Front Desk / Instructor | Attended or Missed, timestamp, staff user | Updates attendance and creates status-history entry |
| Missed Trial | Log Missed Trial Call | Manual | Admin | Missed reason, notes, reschedule offered, follow-up date | Updates Trial and Activity; may lead to rescheduling |
| Missed Trial | Send We Missed You Message | Automated | System | Notification event and delivery metadata | Sends email/SMS with reschedule link; logs delivery |
| Attended Trial | Record Enrollment Decision | Manual | Front Desk / Instructor | Yes/No/Pending, number of children/courses, notes | Updates `enroll_decision`; drives enrollment/nurture branch |
| Did Not Enroll | Log Not-Enrolled Reason | Manual | Admin | Standard reason code and notes | Status becomes `did_not_enroll`; records objection |
| Did Not Enroll | Start Nurture Sequence | Automated | System | Campaign/workflow ID, consent state | Enrolls eligible lead in nurture workflow |
| Web-Enrolled | Process Web Checkout | Automated | Payment webhook | Provider transaction, amount, class, term, children | Verifies payment; creates/activates Enrollment with `source = web` |
| FD-Enrolled | Enroll On-Site | Manual | Front Desk | Payment method/reference, class, term, children, waiver | Creates Enrollment with `source = front_desk`; records payment |
| Post-Enrolled | Log Enrollment Call | Manual | Admin | Payment method/reference, class, term, children, notes | Creates Enrollment with `source = admin_call`; records payment |
| Enrolled (Term 1) | Assign to Class/Roster | Manual | Admin | Class ID, term, capacity result | Sets `Enrollment.class_id`; reserves roster seat atomically |
| Enrolled (Term 1) | Send Enrollment Confirmation | Automated | System | Enrollment/payment notification data | Sends confirmation and receipt after verified payment |
| Enrolled (Term 1) | Send Welcome Email | Automated | System | Schedule/materials URLs and delivery metadata | Sends welcome information after enrollment activation |
| Confirmed on Orbund | Sync to Orbund | Automated / manual fallback | System / Admin | Orbund ID, attempt, status, response, sync time | Updates Orbund sync fields and records audit event |
| Any Stage | Add Note | Manual | Authorized staff | Note, author, timestamp | Appends immutable Activity/Note entry |
| Any Stage | Manual Status Override | Manual | Admin / Supervisor | New status and required reason | Updates status and writes status-history audit entry |
| Any Stage | Set Follow-Up Reminder | Manual | Admin | Follow-up date/time and optional assignee | Places lead in follow-up/Call Today queue |
| Any Stage | Confirm Lead Data (QA) | Manual | Supervisor | Verified flag, verifier, timestamp, optional notes | Marks lead data as quality-checked |
| Any Stage | Receive Inbound SMS Reply | Automated | SMS webhook | Sender, text, provider ID, timestamp, signature result | Creates Message; may flag follow-up or execute supported command |

## 3. Required Data by Record

### 3.1 Lead

| Field | Required | Notes |
|---|---|---|
| `id` | Yes | System-generated identifier |
| `status` | Yes | Current canonical lifecycle status |
| `parent_first_name`, `parent_last_name` | Yes | Parent/guardian identity |
| `email` | Yes for web leads | Normalize before matching |
| `phone` | Yes | Normalize to a consistent international format |
| `preferred_contact_method` | No | Email, SMS, or phone |
| `preferred_call_at` | No | Business-timezone datetime |
| `program_interest` | Yes | Coding, Robotics, or approved value |
| `postal_code` | No | Used for location/service analysis |
| `source` | Yes | Web, phone, walk-in, campaign, referral, etc. |
| `children_count` | No | Summary only; child records remain authoritative |
| `course_interest_count` | No | Summary only |
| `marketing_email_consent` | Yes | Consent state and capture timestamp |
| `marketing_sms_consent` | Yes | Consent state and capture timestamp |
| `next_call_due_at` | No | Drives follow-up queue |
| `is_spam` | Yes | Default false |
| `duplicate_of_lead_id` | No | Canonical Lead link |
| `data_confirmed_at`, `data_confirmed_by` | No | Supervisor QA metadata |
| `created_at`, `updated_at` | Yes | System timestamps |

### 3.2 Child / prospective student

| Field | Required | Notes |
|---|---|---|
| `lead_id` or `parent_id` | Yes | Ownership relationship |
| `first_name`, `last_name` | Yes | Student identity |
| `date_of_birth` | Yes | Preferred over storing age alone |
| `age_at_inquiry` | Derived | Snapshot for reporting if needed |
| `program_interest` | Yes | Coding/Robotics |
| `experience_level` | No | Optional placement information |
| `notes` | No | Avoid sensitive data unless necessary |

### 3.3 Trial

| Field | Required | Notes |
|---|---|---|
| `lead_id`, `student_id`, `class_id` | Yes | Core relationships |
| `status` | Yes | Booked, scheduled, completed, cancelled, etc. |
| `scheduled_at` | Yes | Store timezone-aware value |
| `location_id` | Yes | Canonical location reference |
| `booked_by_type`, `booked_by_id` | Yes | Parent, staff, or system |
| `booked_at` | Yes | Audit timestamp |
| `attendance` | No until class | Unknown, attended, or missed |
| `attendance_marked_at`, `attendance_marked_by` | No | Required once attendance is set |
| `missed_reason_code`, `missed_reason_notes` | No | Used when missed |
| `enroll_decision` | No until decision | Yes, No, or Pending |
| `enroll_decision_at`, `enroll_decision_by` | No | Required once recorded |
| `not_enrolled_reason_code`, `not_enrolled_notes` | No | Used when decision is No |

### 3.4 Enrollment

| Field | Required | Notes |
|---|---|---|
| `lead_id`, `parent_id`, `student_id` | Yes | Traceability and ownership |
| `trial_id` | No | Present for trial conversions |
| `class_id`, `term_id` | Yes before activation | Placement and term |
| `source` | Yes | `web`, `front_desk`, or `admin_call` |
| `status` | Yes | Pending, active/enrolled, cancelled, completed |
| `payment_status` | Yes | Pending, paid, failed, refunded |
| `payment_id` | Required when paid | Verified Payment relationship |
| `waiver_signed_at` | As applicable | Required for on-site enrollment if policy applies |
| `created_by` | Yes | System or staff actor |
| `created_at`, `activated_at` | Yes / conditional | Lifecycle timestamps |
| `orbund_student_id` | No until synced | External identifier |
| `orbund_sync_status` | Yes | Not queued, queued, processing, synced, failed |
| `orbund_sync_at`, `orbund_sync_error` | No | Sync audit data; sanitize sensitive responses |

### 3.5 Call / activity

| Field | Required | Notes |
|---|---|---|
| `lead_id` | Yes | Parent Lead relationship |
| `type` | Yes | Call, note, SMS, email, status change, QA, etc. |
| `direction` | Conditional | Inbound/outbound for calls and messages |
| `outcome_code` | Conditional | Standard dropdown value |
| `notes` | No | Staff-entered context |
| `occurred_at` | Yes | Actual activity time |
| `created_by` | Yes | Staff or system actor |
| `provider_message_id` | No | Used for email/SMS deduplication |

### 3.6 Payment

| Field | Required | Notes |
|---|---|---|
| `enrollment_id` | Yes | Enrollment relationship |
| `amount`, `currency` | Yes | Server-calculated expected amount |
| `method` | Yes | Card, cash, terminal, phone, etc. |
| `status` | Yes | Pending, paid, failed, refunded |
| `provider`, `provider_transaction_id` | Conditional | Required for provider payments |
| `verified_at`, `verified_by` | Required when paid | Webhook/system or staff verifier |
| `receipt_number` | No | Generated or provider value |

## 4. Recommended Dropdown Values

### Call outcome

- No answer
- Left voicemail
- Spoke — trial booked
- Spoke — follow-up needed
- Not interested
- Invalid number
- Requested no contact

### Missed-trial reason

- Forgot
- Schedule conflict
- Illness
- Transportation/location issue
- No longer interested
- Unable to contact
- Other

### Did-not-enroll reason

- Price
- Distance/location
- Schedule conflict
- Not ready
- Program fit
- Chose competitor
- Needs another decision-maker
- Follow-up later
- Other

## 5. Button and Permission Rules

| Action | Minimum recommended permission |
|---|---|
| Create/edit Lead, log call, add note, set reminder | Leads: Edit |
| Mark spam or duplicate | Leads: Edit |
| Book/reschedule Trial | Trial Enrollments: Edit |
| Verify roster/capacity | Classes: Edit and Trial Enrollments: Edit |
| Mark attendance | Attendance: Edit |
| Record enrollment decision | Trial Enrollments: Edit |
| Create front-desk/admin-call Enrollment | Enrollments/Payments: Edit |
| Assign roster seat | Classes: Edit and Enrollments: Edit |
| Override status | Admin/Supervisor role plus relevant Edit permission |
| Confirm lead data (QA) | Supervisor/Admin role |
| Retry/manual Orbund sync | Integration/Admin permission |

All permissions must be enforced by the backend. Hiding a button in the frontend is not sufficient authorization.

## 6. Automation Rules

### 6.1 Transactional versus marketing messages

- Inquiry confirmations, trial details, reminders, receipts, and enrollment confirmations are transactional.
- Nurture sequences are marketing communications and require the applicable consent and unsubscribe handling.
- A global opt-out must not suppress legally/operationally necessary transactional messages unless policy requires it.

### 6.2 Scheduling

- Store scheduled datetimes consistently and evaluate jobs in the official Exceed Robotics business timezone.
- Rescheduling must cancel or invalidate all unsent messages tied to the old schedule.
- Each scheduled action needs an idempotency key, for example `trial:{id}:24h-reminder:{scheduled_at}`.

### 6.3 Duplicate detection

- Normalize phone and email before matching.
- Automatic matching should suggest a duplicate; irreversible merge should require staff confirmation unless the match is exact and policy explicitly permits automatic merging.
- Retain a reference from the duplicate to the canonical record for auditability.

### 6.4 Inbound SMS

- Validate the provider webhook signature before processing.
- Always store the original message and provider ID.
- Only documented commands should change state automatically.
- Unrecognized replies set `follow_up_required = true` for staff review.

### 6.5 Orbund synchronization

- Queue sync only after enrollment activation and required data validation.
- Use retry with backoff for transient errors.
- Do not create duplicate Orbund students/enrollments on retry.
- Surface permanent failures in an admin queue with the failure reason and Retry button.

## 7. Audit and Validation Requirements

- Manual status overrides require a reason.
- Status history, notes, calls, and message logs must preserve author and timestamp.
- Payment amounts and class capacity must be validated server-side.
- Roster assignment must atomically verify capacity.
- Provider webhooks and scheduled jobs must be idempotent.
- Sensitive payment data must never be stored directly; retain only approved provider references and safe metadata.
- Deletes should be soft deletes or archived records where operational history must be retained.

## 8. Reporting Fields

The captured data should support:

- Lead volume and source conversion
- Time to first contact
- Lead-to-trial conversion
- Trial booking and attendance rates
- Missed-trial reasons and reschedule rate
- Trial-to-paid conversion
- Did-not-enroll reasons
- Enrollment conversion by source (`web`, `front_desk`, `admin_call`)
- Revenue and payment status
- Orbund sync success/failure rate
- Staff follow-up workload and overdue calls
