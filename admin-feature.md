# LMS-EDU Admin Features

This document is the living inventory of implemented LMS-EDU admin features. Update it whenever an admin feature is added, changed, or removed.

## 1. Authentication and Security

- Admin login through the Laravel API.
- Database-backed API tokens stored as hashes.
- Configurable token expiration.
- Authenticated session verification through `/api/auth/me`.
- Logout revokes the current API token.
- Admin dashboard includes a visible Logout button in the sidebar.
- Admin dashboard route protection.
- Production CORS support for the Vercel frontend.

## 2. Staff Access Levels

Three staff access levels are implemented:

- **Super Admin**
  - Full access to every admin module and action.
  - Can invite staff members.
  - Can assign access levels and permissions.
  - Only one Super Admin account is supported and this level cannot be assigned through invitations.
- **Admin**
  - Module access is determined by assigned permissions.
- **Operator**
  - Limited module access is determined by assigned permissions.

Parent accounts remain separate from staff accounts.

## 3. Module Permissions

Permissions can be assigned for these modules:

- Leads
- Trial Enrollments
- Parents
- Users
- Classes
- Notifications
- Workflows
- Attendance
- Settings

Each module supports these permission actions:

- **View**
- **Edit**
- **Delete**

Permissions are enforced by Laravel middleware. The frontend also hides inaccessible navigation items and controls.

## 4. Staff Invitations

- Super Admin can open the Users tab and select **Invite staff**.
- Invite form includes:
  - Full name
  - Email address
  - Access level (Admin or Operator)
  - Module/action permission grid
- Invitations use secure random tokens.
- Invitation tokens are stored as hashes.
- Invitations expire after seven days.
- Invitation links can only be accepted once.
- Invited staff set their own password.
- Invitation email is dispatched through the notification system.
- The invitation URL is also shown to the Super Admin as a fallback.
- The invitation form closes when navigating away from the Users tab.

## 5. Dashboard Overview

- Database-backed dashboard counts.
- Trial Enrollment count.
- User count.
- Class count.
- Revenue from completed payments only.
- Pending enrollment count.
- Sidebar counts for:
  - Leads
  - Trial Enrollments
  - Parents
  - Users
  - Classes
  - Notification Logs
  - Workflows
- Loading placeholders are displayed while counts are fetched.
- Latest enrollment activity is displayed on the dashboard.
- Quick navigation actions are available.

## 6. Lead Management

- First-step trial form submissions create lead records.
- Leads remain marked `is_registered = No` until registration succeeds or an operator updates them.
- Admin can update registration status.
- Lead submission date/time is displayed.
- `Updated At` changes when registration status changes.
- Reminder call count is stored separately.
- Reminder call history stores every operator-entered date/time.
- Operators select the call date/time instead of using an automatic call-log button.
- Next scheduled call date/time can be managed by an operator.
- Reminder email count is stored separately.
- Reminder email history stores every sent date/time.
- Automatic lead reminder schedule supports day 1, day 3, and day 7.
- Reminder emails stop when the lead becomes registered.

## 7. Trial Enrollments

- Dedicated Trial Enrollments admin tab.
- General Enrollments tab removed from admin navigation.
- Trial records are recognized from both supported enrollment-student storage formats.
- Parent, email, phone, students, amount, status, booking date, and response details are displayed.
- Status values:
  - Pending
  - Confirmed
  - Cancelled
- Admin can manually update enrollment status when permitted.
- Admin status changes are recorded with response channel `admin`.
- Enrollment deletion is permission-controlled.

## 8. Trial Confirmation Workflow

- New trial bookings default to `pending`.
- Thank-you page no longer automatically confirms a booking.
- Approximately 24 hours before class, parents receive a confirmation request.
- Confirmation request supports:
  - Email Confirm/Cancel links
  - SMS confirmation link
  - SMS reply with `CONFIRM` or `CANCEL`
- Secure expiring confirmation tokens are stored as hashes.
- Public confirmation page requires the parent to submit the final choice.
- Email scanners cannot confirm or cancel a booking merely by opening a link.
- Confirmation response tracking includes:
  - Request sent time
  - Response time
  - Response channel
  - Final status
- Supported response channels:
  - Email link
  - SMS link
  - SMS reply
  - Admin
- Repeated responses are handled safely.
- Confirmation and cancellation notifications are dispatched.

## 9. Parent Management

- Dedicated Parents tab.
- Displays registered parent accounts.
- Parent search by name, email, or phone.
- Parent count comes directly from the database.

## 10. User Management

- Dedicated Users tab.
- Displays parent and staff accounts.
- Displays staff access level.
- User search by name, email, or phone.
- Super Admin invitation interface is located in this tab.

## 11. Class Management

- Dedicated Classes tab.
- Class records are stored in Laravel.
- Admin can create classes when permitted.
- Admin can delete classes when permitted.
- Class settings include curriculum/class name, location, course, age group, date, time, type, instructor, capacity, and available slots.
- Trial class data can be seeded idempotently.

## 12. Attendance

- Dedicated Attendance tab.
- Filter attendance by class date and class.
- Displays student, parent, class, date/time, and attendance status.
- Attendance statuses:
  - Attended
  - No-Show
- Supports marking all visible students attended.
- No-show email workflow is available.
- Attendance date/time is formatted as a readable local date without timezone shifting.

## 13. Notification Logs

- Dedicated Notifications tab.
- Logs email and SMS notifications.
- Log fields include:
  - Type
  - Event
  - Recipient
  - Subject
  - Status
  - Error details
  - Created time
- Filters support notification type, event, and status.
- Dashboard notification count comes directly from the database.

## 14. Workflows

- Five built-in workflows are displayed.
- Custom workflows are stored in the database.
- Custom workflows can use manual or event triggers.
- Optional location and course conditions.
- Email and SMS channels can be configured independently.
- Workflows can be enabled or disabled.
- Manual workflow execution is supported.
- Workflow events can be created, edited, and deleted.
- Workflow badge combines built-in and database custom workflows.

## 15. Trial Configuration Settings

- Manage trial locations.
- Manage trial age groups.
- Configuration changes are stored in Laravel.
- Settings access is controlled by module permissions.

## 16. Payment and Revenue Administration

- Payment creation and processing use Laravel endpoints.
- Razorpay signature verification.
- Razorpay webhook handling.
- Payment reservation expiration.
- Payment status tracking.
- Revenue card includes completed payments only.
- Pending, failed, refunded, and free-trial amounts are excluded from revenue.

## 17. External Integrations

- Twilio sends outgoing SMS notifications.
- Twilio incoming webhook validates request signatures.
- SendGrid sends email notifications.
- Razorpay supports payment processing and webhooks.

## 18. Removed Features

- Frontend Orbund proxy API route.
- Unused Students page.
- Unused standalone Thank You page.
- Unused frontend `lib/api` enrollment module.
- General Enrollments admin tab.
- Continuing Education feature, including its routes, UI, models, migrations, and database tables.

## 19. Production Deployment

- Frontend deployed through Vercel.
- Laravel backend deployed through Render Docker.
- PostgreSQL used in production.
- Migrations run automatically during backend startup.
- Seeders run automatically and are designed to avoid logical duplicates.
- Production seed data includes:
  - Super Admin
  - Demo parent/student records
  - Trial classes
  - Trial enrollments
  - Leads
  - Notification logs
  - Custom workflow
- Production frontend/backend CORS configuration is implemented.

## Maintenance Rule

Whenever an admin feature is implemented, changed, or removed:

1. Update the relevant section in this file.
2. Add a new section if no existing section applies.
3. Update permission requirements when access behavior changes.
4. Update the Removed Features section when functionality is deleted.
5. Keep descriptions aligned with the actual deployed behavior.
