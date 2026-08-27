# Product Requirements Document: Exceed Robotics LMS

**Product:** LMS-EDU / Exceed Robotics LMS  
**Document status:** Draft v1.0  
**Last updated:** July 26, 2026  
**Primary market:** Exceed Robotics, Canada  
**Target locations:** Thornhill, Richmond Hill, and Yonge & Lawrence

## 1. Product Summary

Exceed Robotics LMS is a web-based enrollment and operations platform for coding and robotics programs for children aged 7–15. It gives parents a simple way to discover and book trial classes, manage their accounts, and review their children's registrations. It gives authorized staff a single place to manage leads, classes, trial enrollments, attendance, communications, users, and payments.

The immediate product focus is a reliable trial-class funnel—from lead capture through attendance—supported by role-based administration and automated email/SMS communication. Paid enrollment is supported at the payment and data layers, but a complete public paid self-registration journey is not part of the current core release.

## 2. Problem Statement

Parents need a clear, low-friction way to find an age-appropriate class, register one or more children, and receive timely confirmation and reminders. Staff need to operate that funnel without relying on disconnected spreadsheets, manual follow-ups, or multiple systems.

The current repository also contains documentation from earlier prototypes and integrations. Those artifacts describe different markets, schemas, and booking behavior. The product needs one authoritative definition centered on the live `school_classes`, enrollment, lead, notification, and user-management systems.

## 3. Product Vision

Create a trusted enrollment experience that converts prospective families into attended trial classes and gives staff complete visibility and control from first contact through follow-up.

## 4. Goals

### 4.1 Business goals

- Increase completed trial bookings from qualified leads.
- Reduce staff effort required to confirm bookings and follow up with parents.
- Reduce no-shows through scheduled confirmation requests and reminders.
- Provide accurate operational reporting for leads, registrations, attendance, payments, and communications.
- Establish a stable foundation for a future native paid-registration journey.

### 4.2 User goals

- Parents can find a suitable class and register without re-entering the same information.
- Parents can see their children's registrations and maintain their account securely.
- Staff can act on leads, bookings, attendance, and communication history from one portal.
- Administrators can safely delegate work using granular permissions.

### 4.3 Non-goals for this release

- Corporate or employee registration portals.
- Continuing-education features.
- Digital certificates or credentials.
- Calendar-provider integrations.
- Configurable reporting or marketing campaign builders.
- Batch/group paid registration.
- Invoice, purchase-order, coupon, or installment-plan workflows.
- Reintroduction of the disconnected legacy `Program`, `Course`, and `CourseClass` prototype.

## 5. Users and Roles

### 5.1 Prospective parent

An unauthenticated visitor looking for a suitable trial class for one or more children.

### 5.2 Registered parent

An authenticated user who can manage their profile, book trials, and review their children's trial and paid registrations.

### 5.3 Operator

A staff member with limited, explicitly assigned permissions for day-to-day tasks such as lead follow-up, enrollment updates, or attendance.

### 5.4 Admin

A staff member whose module access and allowed actions are controlled by assigned permissions.

### 5.5 Super Admin

The single highest-privilege staff account. It can access every module, invite staff, assign access levels, and configure permissions.

## 6. Scope and Release Priorities

| Priority | Capability | Release expectation |
|---|---|---|
| P0 | Authentication and authorization | Required for release |
| P0 | Trial lead capture and class booking | Required for release |
| P0 | Trial confirmation/cancellation | Required for release |
| P0 | Parent dashboard | Required for release |
| P0 | Admin operations and permissions | Required for release |
| P0 | Notification delivery and logging | Required for release |
| P0 | Class and capacity management | Required for release |
| P1 | Attendance and no-show follow-up | Required for operational launch |
| P1 | Razorpay payment recording and verification | Required before accepting native paid payments |
| P1 | Production deployment and monitoring | Required for public launch |
| P2 | Complete public paid self-registration | Future release |
| P2 | Waitlists, coupons, payment plans, and campaigns | Future release |

## 7. Core User Journeys

### 7.1 Trial booking

1. A parent opens the trial flow.
2. The parent submits name, email, and phone; the system creates or updates a lead.
3. The parent filters available classes by location, age group, course, and relevant schedule options.
4. The parent selects a class and adds one or more children.
5. The parent reviews the selection.
6. The parent signs in or creates an account; collected contact details are reused.
7. The system creates a trial enrollment and displays a confirmation/thank-you state.
8. Staff and parent notifications are sent according to the configured workflows.

### 7.2 Pre-class confirmation

1. Approximately 24 hours before class, the system sends a confirmation request by email and SMS.
2. The parent follows a secure link or replies by SMS with `CONFIRM` or `CANCEL`.
3. Link-based responses require an explicit final submission so email scanners cannot change booking status.
4. The system records the final status, response time, and response channel.
5. Repeated or expired responses are handled safely and do not create conflicting state.

### 7.3 Parent account management

1. A parent signs in and opens the dashboard.
2. The dashboard shows registration counts, recent registrations, and all children's classes.
3. Trial and paid registrations appear in one consistent view.
4. The parent can update their name and phone or change their password after confirming the current password.

### 7.4 Staff operations

1. A staff member signs in to the protected admin portal.
2. The portal only shows modules and actions allowed by their permissions.
3. Staff review leads, follow-up history, trial enrollments, classes, attendance, notifications, and workflows.
4. Authorized staff update records; every sensitive operation is validated again by the backend.

## 8. Functional Requirements

### FR-1: Authentication and account security

- Parents can register, sign in, restore a valid session, and sign out.
- Staff accounts are distinct from parent accounts.
- API tokens are stored as hashes, expire according to configuration, and are revoked on logout.
- Protected parent and admin routes reject unauthenticated requests.
- Parents can update their profile and change their password using the current password.
- Passwords must contain at least eight characters; confirmation must match.

**Acceptance criteria**

- Invalid credentials return a clear error without revealing whether an account exists.
- A valid session survives normal page navigation and refresh.
- A logged-out or expired user is redirected to the appropriate sign-in experience.
- A staff user cannot access a module or action without the required backend permission.

### FR-2: Lead capture and follow-up

- The first trial step stores parent name, email, phone, source, and submission time.
- Repeated submissions must not create uncontrolled duplicate leads.
- A lead remains unregistered until account/registration success or an authorized manual update.
- Staff can search/filter leads and update registration status.
- Staff can record reminder call times, call history, next call time, reminder email count, and email history.
- Automated lead reminder emails can run on days 1, 3, and 7 and stop once the lead is registered.

**Acceptance criteria**

- A valid trial inquiry appears in the Leads admin view.
- The lead submission timestamp is preserved, while `updated_at` changes when staff update it.
- Scheduled reminders do not send after the lead is registered.

### FR-3: Class discovery and availability

- Trial classes use the live `school_classes` data source.
- Parents can filter by location, age group, and course.
- Supported launch locations are Thornhill, Richmond Hill, and Yonge & Lawrence.
- Launch age/course options are Robotics for ages 7, 8, 9–11, and 12–15, plus Coding for ages 12–15.
- Results display curriculum, course, location, date, time, instructor, type, price, and availability.
- Sold-out or unavailable classes cannot be booked.

**Acceptance criteria**

- Filter results match all selected criteria.
- Availability is revalidated when the enrollment is created.
- The system never permits capacity to fall below zero.

### FR-4: Trial cart and student details

- Parents can add one or more children to a selected trial class.
- Each child record includes the information required by the booking API.
- The review step displays the selected class, children, schedule, location, and price.
- Duplicate submissions caused by refreshes, retries, or React development behavior are idempotent.

**Acceptance criteria**

- One completed booking action creates one logical enrollment.
- Date and time displayed on the confirmation page match the selected class.
- Invalid or incomplete child data blocks progression and identifies the affected field.

### FR-5: Trial enrollment lifecycle

- Trial enrollments support `pending`, `confirmed`, and `cancelled`.
- New bookings default to `pending`.
- Authorized admins can update the status.
- Confirmation responses can arrive through email link, SMS link, SMS reply, or admin action.
- The system records request time, response time, response channel, and final status.
- Enrollment deletion requires explicit delete permission.

**Acceptance criteria**

- A booking is not confirmed merely because a confirmation link was opened.
- `CONFIRM` and `CANCEL` SMS replies update the intended enrollment after signature and sender validation.
- Repeated responses are idempotent and return a clear final-state message.
- Parent and admin views show the same current status.

### FR-6: Parent dashboard

- The dashboard contains Overview, My Children's Classes, and Profile sections.
- Overview shows total registrations, trial registrations, and recent activity.
- Children's Classes combines trial and paid registrations.
- Parents only see records associated with their own account.
- Empty states guide the parent back to trial discovery.

**Acceptance criteria**

- A parent cannot retrieve another parent's enrollments by modifying a request.
- Newly created registrations appear after data refresh.
- Trial and paid child records use a consistent display model.

### FR-7: Admin portal and role-based access

- The admin portal provides Dashboard, Leads, Trial Enrollments, Parents, Users, Classes, Attendance, Notifications, Workflows, and Settings modules.
- Permission actions are View, Edit, and Delete per module.
- Frontend controls reflect permissions, while Laravel middleware remains authoritative.
- Super Admin can invite Admin or Operator users, set permissions, and issue a one-time invitation expiring after seven days.
- Invitation tokens are random, hashed at rest, and single-use.

**Acceptance criteria**

- Unauthorized API requests return an authorization error even if the UI is bypassed.
- An invited staff member can set a password once before expiration.
- Admin/operator accounts never gain Super Admin status through the invitation flow.

### FR-8: Class administration

- Authorized staff can create, view, and delete classes.
- A class includes name/curriculum, locations, course, age groups, date, time, type, semester, price, instructor, capacity, and available slots.
- Trial configuration settings manage allowed locations and age groups.
- Production seeders are idempotent and do not create logical duplicates.

**Acceptance criteria**

- Capacity and available slots must be non-negative, and available slots cannot exceed capacity.
- Deleted or unavailable classes no longer accept bookings.
- Configuration changes are persisted and reflected in parent filters.

### FR-9: Attendance

- Staff can filter attendance by class date and class.
- The view includes student, parent, class, schedule, and attendance status.
- Authorized staff can mark a student Attended or No-Show and mark all visible students Attended.
- A no-show email workflow is available.

**Acceptance criteria**

- Attendance updates persist and display using the intended local date without timezone drift.
- Bulk attendance affects only the currently scoped class/list.

### FR-10: Notifications and workflows

- SendGrid sends email and Twilio sends SMS.
- Required events include lead received, user registered, booking received, confirmation request, booking confirmed, booking cancelled, class reminder, staff invitation, and no-show follow-up.
- All attempts are logged with channel, event, recipient, subject where applicable, status, error details, and creation time.
- Custom workflows can be manual or event-triggered, independently enable email/SMS, and optionally filter by location or course.
- Staff can create, edit, enable/disable, delete, and manually fire custom workflows according to permissions.
- Notification jobs run asynchronously through the queue.

**Acceptance criteria**

- Missing/dummy credentials produce a visible skipped/failed log rather than a false success.
- A provider-accepted request creates a sent log.
- Manual workflow execution targets only the intended eligible enrollments.
- Provider secrets never appear in frontend code or notification logs.

### FR-11: Payments and revenue

- Native payment operations use Laravel endpoints and Razorpay.
- The backend verifies Razorpay signatures and webhook authenticity.
- Payment reservations expire safely.
- Payment states include pending, completed, failed, and refunded.
- Revenue reporting includes completed payments only and excludes free trials.

**Acceptance criteria**

- A client-side success response alone cannot mark a payment completed.
- Duplicate webhooks are idempotent.
- Payment/enrollment completion and seat allocation remain consistent after retries or failures.

### FR-12: Reporting and auditability

- Admin dashboard counts come from the database.
- Dashboard metrics include trials, users, classes, pending enrollments, latest activity, and completed-payment revenue.
- Operational history is retained for notification attempts, confirmation responses, lead follow-ups, and payment status changes.

## 9. Data and Business Rules

- The live catalog is based on `school_classes`; legacy course-registration tables must not be used for new features.
- Parent ownership must be enforced server-side for all enrollment and profile reads/writes.
- Email addresses should be normalized before identity or duplicate checks.
- Class capacity must be checked atomically at the final booking/payment boundary.
- A free trial has a zero price but still creates an auditable enrollment.
- Enrollment status and payment status are separate concepts.
- All timestamps are stored consistently and rendered in the appropriate business timezone.
- External callbacks and webhooks must be authenticated and idempotent.
- Personally identifiable information must not be written to application error logs beyond what is operationally necessary.

## 10. Non-Functional Requirements

### 10.1 Security

- Hash passwords, API tokens, invitation tokens, and confirmation tokens.
- Validate every request on the server and enforce least-privilege authorization.
- Validate Twilio signatures and Razorpay signatures/webhooks.
- Keep secrets in environment configuration.
- Enforce HTTPS in production and use restricted CORS origins.
- Apply rate limiting to authentication, public lead, confirmation, and webhook endpoints.

### 10.2 Reliability

- Enrollment, capacity, and payment transitions must be transactional or otherwise recoverable.
- Queue jobs and external callbacks must tolerate retries without duplicate side effects.
- Scheduled reminders must record delivery attempts and avoid repeat sends for the same event window.

### 10.3 Performance

- Typical authenticated API reads should target a p95 response time below 500 ms under expected launch traffic, excluding third-party latency.
- Parent and admin pages must show loading, empty, and error states rather than appearing frozen.
- Admin lists must support pagination or bounded result sets as data grows.

### 10.4 Accessibility and usability

- Core flows must be keyboard accessible and use visible focus states.
- Form controls must have labels and actionable validation messages.
- Text and controls should meet WCAG 2.1 AA contrast expectations.
- The experience must remain usable on current mobile, tablet, and desktop browsers.

### 10.5 Maintainability

- Frontend and backend contracts must use documented, consistent field naming.
- Business rules belong in backend services/controllers and must not rely solely on browser storage.
- Automated tests must cover authorization, booking idempotency, capacity, confirmation, notification dispatch, and payment verification.

## 11. Technical Context and Constraints

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Laravel 11 REST API
- **Production database:** PostgreSQL
- **Authentication:** Database-backed bearer/API tokens
- **Email:** SendGrid
- **SMS:** Twilio
- **Payments:** Razorpay
- **Deployment:** Vercel frontend and Render Docker backend
- **External SIS:** Orbund remains relevant to the existing trial integration, but new product logic must persist authoritative LMS records in Laravel.

Browser storage may support transient trial-flow state, but it is not an authoritative source for authentication, enrollment, payment, or capacity.

## 12. Product Metrics

The launch dashboard should support calculation of:

- Trial form completion rate.
- Lead-to-booking conversion rate.
- Booking-to-confirmation rate.
- Confirmation response rate by channel.
- Confirmed-booking attendance and no-show rates.
- Reminder delivery success/failure rate.
- Time from lead creation to booking.
- Paid checkout completion rate when native paid registration launches.
- Payment failure/refund rate.

Initial targets should be set after two to four weeks of clean baseline data. Instrumentation completeness is a launch requirement even where numeric targets are not yet established.

## 13. Release Acceptance Criteria

The release is ready when:

- A parent can complete the trial journey on mobile and desktop.
- Booking retries do not create duplicate logical enrollments.
- Sold-out classes cannot be overbooked.
- Parent ownership and staff permissions pass backend authorization tests.
- Confirmation requests and explicit confirm/cancel responses work through supported channels.
- Notification attempts are queued and visible in admin logs.
- Staff can manage leads, trials, classes, attendance, users, workflows, and settings according to permission.
- Razorpay signatures/webhooks are verified before any native payment is treated as completed.
- Production CORS, HTTPS, environment secrets, database migrations, queue worker, and scheduler are configured.
- Critical flows have automated backend tests and an end-to-end smoke test.

## 14. Rollout Plan

### Phase 1: Operational validation

- Validate seed/configuration data for all three locations.
- Test the full trial funnel with provider sandbox/test credentials.
- Verify queue worker, scheduler, webhook endpoints, and production logs.
- Train staff on leads, confirmations, attendance, and permission behavior.

### Phase 2: Controlled launch

- Release to internal staff and a limited parent cohort.
- Monitor duplicate bookings, delivery failures, confirmation responses, and capacity discrepancies.
- Resolve launch-blocking issues before opening general traffic.

### Phase 3: General availability

- Open the trial funnel to all supported locations.
- Review funnel and attendance metrics weekly.
- Prioritize public paid self-registration based on verified demand and operational readiness.

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Conflicting legacy and current schemas | Treat `school_classes` and current enrollment models as authoritative; remove or clearly archive obsolete routes/docs |
| Duplicate enrollment from retries or browser behavior | Use server-side idempotency and database constraints/transactions |
| Overbooking under concurrent requests | Recheck and reserve capacity atomically |
| Third-party email/SMS/payment outage | Queue retries, log failures, provide admin visibility, and preserve recoverable state |
| Email security scanners trigger confirmation links | Require an explicit final response submission |
| Browser storage becomes stale or belongs to another account | Revalidate identity and all booking data on the backend |
| Permission mismatch between UI and API | Keep backend middleware authoritative and add authorization tests |
| Timezone errors affect reminders/attendance | Store timestamps consistently and define one business timezone for scheduling/display |

## 16. Open Product Decisions

- What is the official business timezone for reminders and admin reporting?
- How long should an unconfirmed trial seat remain reserved?
- Should cancelled seats immediately return to availability?
- What is the resend/escalation policy when a confirmation request receives no response?
- Is Orbund the long-term system of record, an integration target, or scheduled for replacement by Laravel?
- Which paid-registration capabilities should launch first: single-child checkout, sibling checkout, waitlist, coupons, or payment plans?
- What retention periods apply to leads, notification content, payment records, and confirmation audit data?

## 17. Source of Truth

This PRD defines product intent and release scope. The following repository documents remain implementation references:

- `requirement.md` for the original MVP concept.
- `admin-feature.md` and `parent-feature.md` for the living implemented-feature inventory.
- `docs/` for subsystem behavior and operational notes.
- `NOTIFICATION_REQUIREMENTS.md` for notification design details.
- `free-trial-enrollment-flow-of-orbund.md` for the analyzed Orbund flow.

Where older documents conflict with this PRD, current Canadian locations, the live `school_classes` model, the pending-to-confirmed trial lifecycle, and backend-enforced authorization take precedence.
