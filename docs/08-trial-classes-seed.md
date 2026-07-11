# Trial Classes — Locations, Age Groups & Seed Data

## Active Locations

Table: `departments`

| ID | Name | orbund_campus_type |
|----|------|--------------------|
| 4 | Thornhill | 1 |
| 5 | Richmond Hill | 3 |
| 6 | Yonge & Lawrence | 6 |

> Delhi, Bengaluru, Kolkata were removed — old data not relevant to Exceed Robotics Canada.

## Age Groups

Table: `trial_age_groups`

| ID | Name | Course | orbund_program_id | orbund_level_id |
|----|------|--------|-------------------|-----------------|
| 1 | 7 Years Old | Robotics | 4001270 | 4000281 |
| 2 | 8 Years Old | Robotics | 4001271 | 4000281 |
| 3 | 9–11 Years Old | Robotics | 4001272 | 4000281 |
| 4 | 12–15 Years Old (Robotics) | Robotics | 4001273 | 4000281 |
| 5 | 12–15 Years Old (Coding) | Coding | 4001274 | 4000282 |

## school_classes Table

Created by migration: `2026_07_02_000005_create_school_classes_table.php`

Key columns: `curriculum`, `locations` (JSON), `age_groups` (JSON), `course`, `type`, `semester`, `price`, `date`, `time`, `available_slots`, `instructor`, `max_students`

## Seeded Trial Classes

Seeder: `database/seeders/TrialClassesSeeder.php`

**30 classes total** — 3 locations × 5 age groups (4 Robotics + 1 Coding)

Curriculum name format: `{Course} Trial Class {Location} {AgeGroup}`
Example: `Robotics Trial Class Richmond Hill 7 Years Old`

| Setting | Value |
|---------|-------|
| Type | Trial |
| Price | 0 (free) |
| Available slots | 6 |
| Instructor | TBD |
| Dates | Weekends July 5 – August 3, 2026 |
| Times | Rotating: 10:00 AM / 1:00 PM / 3:00 PM |

### Permutations

|  | Thornhill | Richmond Hill | Yonge & Lawrence |
|--|-----------|--------------|------------------|
| Robotics — 7 Years | ✓ | ✓ | ✓ |
| Robotics — 8 Years | ✓ | ✓ | ✓ |
| Robotics — 9–11 Years | ✓ | ✓ | ✓ |
| Robotics — 12–15 Years | ✓ | ✓ | ✓ |
| Coding — 12–15 Years | ✓ | ✓ | ✓ |

## Re-seeding

Delete existing seeded classes first, then run:

```bash
php artisan db:seed --class=TrialClassesSeeder
```
