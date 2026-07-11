# Email Subject Lines

## Current Subject Formats

| Recipient | Event | Subject | Example |
|-----------|-------|---------|---------|
| Admin | New Lead | `[New Lead] - {Course}` | `[New Lead] - Robotics` |
| Admin | Booking Received | `[Booking Received] - {ClassName}` | `[Booking Received] - Robotics Trial Class Richmond Hill 7 Years Old` |
| Parent | Booking Confirmed | `[Booking Confirmed] - {ClassName}` | `[Booking Confirmed] - Robotics Trial Class Richmond Hill 7 Years Old` |
| Parent | Class Reminder | `Reminder: {ChildName}'s class is tomorrow!` | `Reminder: John Smith's class is tomorrow!` |

## Why These Formats

**`[New Lead]`** — fires at enrollment time (not at lead form submit). This is because the curriculum name is only known after the parent selects a class in step 2. If fired at step 1, only "Robotics" or "Coding" is available.

**`{ClassName}`** — this is the `orbund_class_id` field which stores the full curriculum string like "Robotics Trial Class Richmond Hill 7 Years Old".

## From Address

```
SENDGRID_FROM_EMAIL=admin@exceedrobotics.com
```

Must be verified as a **Sender Identity** in SendGrid:
- SendGrid → Settings → Sender Authentication → Verify a Single Sender
- Enter `admin@exceedrobotics.com` → check inbox → click verification link

## Emails Removed (Intentionally)

| Email | Why removed |
|-------|------------|
| Parent email on lead submit ("Thanks for your interest") | Too early in the flow, no class info yet |
| Parent SMS on lead submit | Same reason |
| Parent email on enrollment created ("Booking received") | Redundant — parent gets confirmed email shortly after |
| Parent SMS on enrollment created | Same reason |

## Admin Email Address

`SENDGRID_ADMIN_EMAIL=habib.a@exceedvirtual.com` — all admin-facing notifications go here.
