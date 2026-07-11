# Admin Portal

File: `frontend/app/admin/page.tsx`

Sidebar navigation, auth-protected. Access at `http://localhost:3000/admin`.

## Sidebar Views

| View | What it shows |
|------|--------------|
| Dashboard | Summary stats |
| Leads | All leads with status filters |
| Enrollments | All enrollments (trial + paid) with filters |
| Classes | School classes management |
| Notifications | Notification log history |
| Workflows | Built-in and custom notification workflows |
| Settings | Admin settings |

## Notification Logs View

- Fetches `GET /api/admin/notification-logs`
- Filters: type, event, status
- Status badges: ✓ Sent (green) · ⚡ Skipped (yellow) · ✗ Failed (red)
- Skipped = dummy credentials in .env
- Sent = real credentials, API accepted

## Workflows View

### Built-in workflows (display cards)

These fire automatically from controllers. Toggles saved in localStorage only (visual).

| Card | Event key |
|------|----------|
| Lead Received | `lead_received` |
| User Registered | `user_registered` |
| Enrollment Created | `enrollment_created` |
| Enrollment Confirmed | `enrollment_confirmed` |
| Enrollment Cancelled | `enrollment_cancelled` |
| Class Reminder | `class_reminder` |

### Custom workflows (DB-backed)

- Create / edit / delete via modal
- Toggle active/inactive
- Manual trigger: "Send Now" button → fires to all confirmed enrollments
- Event trigger: fires automatically when event key matches

## Enrollments View

Shows both paid students (`enrollment_students`) and trial students (`trial_enrollment_students`) per enrollment.

## API Routes (admin-protected)

```
GET    /api/admin/notification-logs
GET    /api/admin/workflows
POST   /api/admin/workflows
PATCH  /api/admin/workflows/{id}
DELETE /api/admin/workflows/{id}
POST   /api/admin/workflows/{id}/fire
GET    /api/enrollments
```

## Print

Navigation bar (`Navigation.tsx`) has `print:hidden` — hidden on all pages when printing.
