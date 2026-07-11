# Search Page

File: `frontend/app/search/page.tsx`

Parents browse and filter available classes.

Access at `http://localhost:3000/search`

## Bug Fix — Paid Classes Hidden

**Problem:** Line 115 had a hardcoded filter:
```typescript
if (c.type === 'Paid') return false;
```
This silently hid every Paid class regardless of any filter selection. Only Trial classes were ever visible.

**Fix:** Removed the hardcoded line. Added a **Type filter pill row** (All / Trial / Paid) to the filter bar so users can optionally narrow by type. Default shows all types.

## Filters Available

- Location
- Course (Robotics / Coding)
- Age group
- Type (All / Trial / Paid)

## Data Source

Classes come from the `school_classes` table via the Laravel API.
Admin can manage classes from `/admin → Classes`.
