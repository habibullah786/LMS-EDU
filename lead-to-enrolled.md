# Exceed Robotics: Lead-to-Enrolled Status Flow

**Document status:** Draft for business review  
**Last updated:** August 17, 2026  
**Purpose:** Define the lifecycle of a prospective family from initial inquiry through confirmed enrollment in Orbund.

## Implementation Status

The workflow is implemented in the Laravel lead pipeline and admin dashboard. Trial booking, rescheduling, confirmation, attendance, enrollment decisions, nurture scheduling, web/front-desk/admin-call enrollment sources, payment activation, roster assignment, inbound SMS logging, and Orbund sync/manual confirmation update the same audited lead lifecycle. Automated Orbund API delivery requires `ORBUND_SYNC_URL` and `ORBUND_API_TOKEN`; without them the enrollment is placed in `manual_required` for staff confirmation.

## 1. Flow Summary

```text
Lead Received
    |
    v
Post-Registered --(trial booked)--> Pre-Registered
    |                                  |
    |                                  v
    |                          Trial Class Scheduled
    |                                  |
    |                         +--------+--------+
    |                         |                 |
    |                         v                 v
    |                  Attended Trial      Missed Trial
    |                         |                 |
    |                         v                 +--(rescheduled)--> Trial Class Scheduled
    |                 Decides to Enroll
    |                         |
    |              +----------+----------+
    |              |                     |
    |              v                     v
    |       Did Not Enroll       Web / FD / Post-Enrolled
    |                                    |
    |                                    v
    +----------------------------> Enrolled (Term 1)
                                         |
                                         v
                                  Confirmed on Orbund
```

## 2. Canonical Status Definitions

| Status | Description | Entry condition | Manual action | Automated action |
|---|---|---|---|---|
| **Lead Received** | A web-form or phone inquiry has been captured. | A new lead record is created. | Admin reviews the lead and calls using the captured phone number. | `lead.created` sends an immediate inquiry-confirmation email to the parent. |
| **Post-Registered** | The family submitted the lead form but has not booked a trial. | Lead exists and has no trial booking. | Admin calls the family and helps book a trial slot. | If `status = post_registered` and no trial exists after 24 hours, send a trial-booking reminder by email/SMS. |
| **Pre-Registered** | A trial was booked online or by staff but has not yet been operationally verified. | A Trial record is created with its class, date, time, and location. | Admin verifies capacity and the class roster. | `trial.created` sends the trial details and calendar link by email/SMS. |
| **Trial Class Scheduled** | The trial is verified and scheduled on the class roster. | Staff verifies the booking/roster, or the booking satisfies an approved automatic verification rule. | Admin or instructor ensures the student is on the roster; parent/admin may reschedule. | At `trial_datetime - 24 hours`, send a reminder by email/SMS. Rescheduling cancels the old reminder and schedules a new one. |
| **Attended Trial** | The family attended the scheduled trial. | Staff sets attendance to `attended`. | Front desk or instructor records attendance. | `trial.attendance_marked = attended` sends a thank-you message and optional survey. |
| **Missed Trial** | The scheduled trial passed and the student did not attend. | Staff sets attendance to `missed`, or a controlled post-class job marks an unresolved past trial as missed. | Admin logs the reason, calls the family, and offers to reschedule. | Send a “We missed you” email/SMS with a reschedule link. |
| **Decides to Enroll** | The family is at the post-trial enrollment decision point. | Trial was attended and the enrollment decision is awaiting or receiving staff input. | Front desk/instructor records `Yes`, `No`, or `Pending`. | No direct message is required; the recorded decision selects the next branch. |
| **Did Not Enroll** | The family attended but declined Term 1 enrollment. | `enroll_decision = no`. | Admin records the reason and follows up on the objection. | Add the lead to an approved nurture sequence, subject to communication consent and opt-out rules. |
| **Web-Enrolled** | The parent enrolled in Term 1 online. | A valid web payment webhook confirms payment and creates the Enrollment record with `source = web`. | Admin verifies payment and roster placement when required. | Send enrollment confirmation and payment receipt after verified payment. |
| **FD-Enrolled** | Front desk enrolled the family after the trial. | Staff creates the Enrollment with `source = front_desk`; payment becomes verified/paid. | Front desk processes payment, paperwork, and waiver. | Send enrollment confirmation and payment receipt after verified payment. |
| **Post-Enrolled** | Admin enrolled the family during a later follow-up call. | Staff creates the Enrollment with `source = admin_call`; payment becomes verified/paid. | Admin closes the enrollment and records payment/class details. | Send enrollment confirmation and payment receipt after verified payment. |
| **Enrolled (Term 1)** | Canonical enrolled state for all successful enrollment sources. | A valid paid Enrollment exists and has an assigned Term 1 class. | Admin confirms roster placement and capacity. | `enrollment.activated` sends the welcome email with schedule and materials. |
| **Confirmed on Orbund** | The enrolled student is officially recorded in Orbund. | Orbund accepts the sync or staff records a verified manual sync. | Admin reviews failed syncs and performs the manual fallback when needed. | `enrollment.activated` queues Orbund sync; success stores Orbund ID, sync status, and sync time. |

## 3. Status Transition Rules

| Current status | Event | Next status |
|---|---|---|
| Lead Received | Initial processing completes and no Trial exists | Post-Registered |
| Lead Received / Post-Registered | Trial is booked | Pre-Registered |
| Pre-Registered | Capacity and roster are verified | Trial Class Scheduled |
| Trial Class Scheduled | Trial is rescheduled | Trial Class Scheduled with revised schedule |
| Trial Class Scheduled | Attendance is marked attended | Attended Trial |
| Trial Class Scheduled | Attendance is marked missed | Missed Trial |
| Missed Trial | Replacement trial is booked | Trial Class Scheduled |
| Attended Trial | Enrollment decision is pending | Decides to Enroll |
| Decides to Enroll | Decision is No | Did Not Enroll |
| Decides to Enroll | Paid enrollment is completed online | Web-Enrolled |
| Decides to Enroll | Paid enrollment is completed at front desk | FD-Enrolled |
| Decides to Enroll / Did Not Enroll | Paid enrollment is completed by admin call | Post-Enrolled |
| Web-Enrolled / FD-Enrolled / Post-Enrolled | Class assignment is valid and enrollment is activated | Enrolled (Term 1) |
| Enrolled (Term 1) | Orbund sync succeeds or manual verification is recorded | Confirmed on Orbund |

## 4. Implementation Clarifications

### 4.1 Enrollment source is data, not a separate lifecycle state

`Web-Enrolled`, `FD-Enrolled`, and `Post-Enrolled` are useful operational labels, but should be derived from `Enrollment.source` rather than stored as three mutually exclusive lead statuses:

- `web`
- `front_desk`
- `admin_call`

The canonical successful lifecycle status is `enrolled_term_1`.

### 4.2 Trial attendance must be explicit

Time passing alone must not be treated as proof that a family missed a trial. A scheduled job may flag a past trial as **Attendance Required**, but only authorized staff or a defined business rule should set the final `attended` or `missed` outcome.

### 4.3 Paid status must be verified

The system must not treat a client-side payment response as proof of payment. Online payments must be confirmed by a verified provider webhook/signature. Front-desk and phone payments require an authorized staff action and an auditable payment record.

### 4.4 Automation must be idempotent

Every scheduled message, payment webhook, enrollment creation, and Orbund sync must tolerate retries without producing duplicate records or messages. Automation should record a unique event/delivery key and its outcome.

### 4.5 Status history must be retained

Every status change must record:

- Previous status
- New status
- Triggering event or manual reason
- Actor (`system` or staff user ID)
- Timestamp
- Related Trial or Enrollment ID, when applicable

## 5. Exceptions and Escape Hatches

- Authorized admins/supervisors may override a status with a required reason.
- Spam leads move to `dropped_spam` and stop all automated outreach.
- Duplicate leads are linked to the canonical lead and excluded from duplicate automation.
- Communication opt-out immediately suppresses non-transactional email/SMS.
- Failed Orbund syncs remain `enrolled_term_1` internally with `orbund_sync_status = failed`; enrollment must not be rolled back solely because the external sync failed.
- Cancelled or refunded paid enrollments require a separate cancellation/refund workflow and must not be represented as Did Not Enroll.

## 6. Recommended System Events

| Event key | Trigger |
|---|---|
| `lead.created` | Lead record committed |
| `lead.trial_booking_reminder_due` | Lead has no Trial 24 hours after creation |
| `trial.created` | Trial booking committed |
| `trial.rescheduled` | Trial schedule changes |
| `trial.reminder_due` | Trial begins in approximately 24 hours |
| `trial.attendance_marked` | Attendance is set to attended/missed |
| `trial.enrollment_decision_recorded` | Decision is Yes/No/Pending |
| `enrollment.payment_confirmed` | Payment becomes verified/paid |
| `enrollment.activated` | Enrollment and class assignment are complete |
| `enrollment.orbund_sync_requested` | Active enrollment is queued for Orbund |
| `enrollment.orbund_sync_succeeded` | Orbund accepts the record |
| `enrollment.orbund_sync_failed` | Sync attempt fails and needs retry/review |
