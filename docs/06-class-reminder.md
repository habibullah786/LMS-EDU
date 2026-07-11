# 24-Hour Class Reminder

Automated reminder email + SMS sent to parents the day before their child's trial class.

## How It Works

1. Parent books trial class → `class_date` and `class_time` saved to `trial_enrollment_students`
2. Every morning at 09:00, scheduler runs `php artisan notifications:send-reminders`
3. Command finds all confirmed trial students where `class_date = tomorrow`
4. Sends email + SMS to each parent

## Email Sent to Parent

**Subject:** `Reminder: {ChildName}'s class is tomorrow!`

**Body includes:**
- Child's name
- Class name
- Location
- Time

## Database Changes

**Migration:** `2026_07_03_000001_add_class_datetime_to_trial_enrollment_students.php`

Added two columns to `trial_enrollment_students`:

| Column | Type | Example |
|--------|------|---------|
| `class_date` | date, nullable | `2026-07-05` |
| `class_time` | string, nullable | `10:00 AM` |

## Files Changed

| File | What changed |
|------|-------------|
| `database/migrations/2026_07_03_000001_...php` | Added class_date, class_time columns |
| `app/Models/TrialEnrollmentStudent.php` | Added both fields to $fillable |
| `app/Http/Controllers/OrbundEnrollmentController.php` | Validates + saves class_date, class_time per student |
| `app/Console/Commands/SendDailyReminders.php` | Queries by class_date = tomorrow |
| `routes/console.php` | Schedule::command daily at 09:00 |
| `frontend/lib/lmsApi.ts` | Added class_date, class_time to student type |
| `frontend/app/trial/login/page.tsx` | Passes _date/_time from cartStudents |

## Scheduler Setup (Server)

Add this cron to the server:

```bash
* * * * * cd /path/to/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

## Test Command

```bash
# See what would be sent without actually sending
php artisan notifications:send-reminders --dry-run

# Run for real
php artisan notifications:send-reminders
```
