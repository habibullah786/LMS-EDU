# Ed-Tech Booking Platform — Backend Build Plan

Scope: parent registration → student profiles → browse classes (location × age group × course) →
multi-student/multi-class cart → free-or-paid checkout (Razorpay) → enrollment.

## 0. Read this first — how this maps onto the existing codebase

This is **not a greenfield build**. `backend-laravel/` already implements a large chunk of this
flow. Building it from scratch would duplicate working code and fragment the data model further
(it's already fragmented — see below). This plan is written as **deltas on top of what exists**,
not a parallel system.

### Already exists and should be reused

| Concern | Existing piece | File |
|---|---|---|
| Parent auth | `AuthController` + custom bearer-token middleware | `app/Http/Middleware/AuthenticateApiToken.php` |
| Student profiles | `Student` model, `students` table | `database/migrations/2024_01_03_000000_create_students_table.php` |
| Course browse/filter | `CourseController` (`listCourses`, `getAvailableClasses`, `getCoursesByLocation`, `getCoursesByAgeGroup`, `getFilterOptions`) | `app/Http/Controllers/CourseController.php` |
| Registration + enrollment creation | `RegistrationController` (`registerIndividual`, `registerBatch`) | `app/Http/Controllers/RegistrationController.php` |
| Waitlist on full class | `WaitlistController` + `Waitlist` model | `app/Http/Controllers/WaitlistController.php` |
| Payment record-keeping | `PaymentController`, `Payment` model | `app/Http/Controllers/PaymentController.php` |
| Program/Department (location) hierarchy | `Program`, `Department` models | `database/migrations/2026_07_02_...` |

### Real gaps vs. what's being asked for

1. **No cart exists at all.** No `carts` table, no `Cart` model, no session-cart logic anywhere.
   This is the one genuinely net-new subsystem.
2. **Two competing "class" models**, not one hierarchy:
   - `Program → Department(location) → Course(age_group, level) → CourseClass` — relational, used by `CourseController`.
   - `SchoolClass` — a flatter, admin-authored table with `locations` and `age_groups` as **JSON arrays** (one row can serve multiple locations/age-groups at once), `curriculum` as a free-text label, used by `SchoolClassController`.
   These need to be **unified into one canonical hierarchy** before "Location → Age Group → Course → Curriculum → Classes" can mean one thing. See Decision D1 below.
3. **Razorpay isn't actually wired up.** `PaymentController::createPayment` returns a fake
   `order_'.uniqid()` (not a real Razorpay order), and `processPayment` explicitly comments "For
   MVP, we simulate verification" — the signature is never checked. `config/services.php` has no
   `razorpay` block; `.env.example` has no `RAZORPAY_*` vars. This needs a real implementation.
4. **No seat-locking under concurrency.** Seat counts (`available_seats` / `available_slots`) are
   decremented in plain PHP without row locking — two simultaneous checkouts can both pass the
   "is there a seat" check and overbook a 6-seat class.
5. **The DB-level duplicate-enrollment guard was removed**, not weakened. Migration
   `2026_06_23_000002_update_enrollment_students_for_orbund.php` dropped the unique constraint on
   `(enrollment_id, student_id, class_id)` to support Orbund's data shape, and never replaced it
   with an equivalent. Duplicate-enrollment prevention currently exists only if the calling code
   remembers to check — it doesn't, reliably.
6. **`AdminController::filterOptions()` still hardcodes stale values** — `locations => ['Delhi',
   'Bengaluru', 'Kolkata']`, `courses => ['Coding', 'Robotics']` (line ~70). Real seeded data is
   Thornhill / Richmond Hill / Yonge & Lawrence. This is dead code that will silently mislead any
   admin UI filter still calling it.

### ⚠️ Open question before writing code — please confirm

The location examples in this spec (Delhi, Bengaluru, Kolkata) and the payment gateway
(Razorpay) are India-specific. The actual seeded data in this codebase is Thornhill / Richmond
Hill / Yonge & Lawrence (Greater Toronto Area), consistent with Exceed Robotics being a
Canada-based operation. Two ways to proceed:

- **(A)** This is genuinely a new/separate regional deployment (e.g. an India expansion) and
  Razorpay + those cities are correct — proceed as specified.
- **(B)** This should target the existing GTA locations, and the payment gateway should be
  Stripe (or whatever the org already uses for CAD payments) instead of Razorpay.

Everything below is written generically (`{location}`, `{gateway}`) so either answer slots in
without a rewrite — but **the Razorpay SDK integration in Phase 2 assumes (A) unless told
otherwise.**

---

## 1. Decisions

- **D1 — Canonical hierarchy:** Standardize on `Program → Department(location) → Course(age_group,
  level) → Curriculum → CourseClass`. Introduce a new `Curriculum` model (currently missing) as the
  explicit link the spec asks for between `Course` and its `CourseClass` instances. `SchoolClass`
  becomes deprecated — its `locations[]`/`age_groups[]` JSON-array rows get migrated into
  per-location, per-age-group `Course` + `Curriculum` rows (a JSON array covering 3 locations
  becomes 3 relational rows). This is a data migration, not just a schema change — flag for a
  dedicated migration script with a dry-run mode.
- **D2 — Duplicate enrollment:** Re-add a unique index, but scoped correctly this time: unique on
  `(student_id, class_id)` where `student_id IS NOT NULL` (a student can't double-book the same
  class; Orbund-sourced rows with null `student_id` are unaffected). Postgres supports partial
  unique indexes for this (`CREATE UNIQUE INDEX ... WHERE student_id IS NOT NULL`).
- **D3 — Seat locking:** Use Postgres row locks (`SELECT ... FOR UPDATE`) inside a DB transaction
  as the source of truth for seat counts — this is correct with zero new infra. Add Redis
  (`Cache::lock()`, already available via Laravel's atomic locks) as a short-lived
  application-level mutex *in front of* the DB transaction, to fail fast under high contention
  instead of queuing every request on a Postgres row lock. Redis is the accelerant, Postgres is
  the guarantee — not the other way around.
- **D4 — Cart:** DB-backed (`carts` + `cart_items`), not session-only. A parent might add items on
  mobile and check out on desktop, and DB-backed carts survive the `sync` queue / server restarts
  that session-only storage wouldn't. One open cart per parent (`status = 'open'`), enforced with
  a partial unique index.

---

## 2. Database schema

### New tables

```sql
-- Curriculum: the explicit link the spec asks for between Course and its scheduled CourseClasses
CREATE TABLE curricula (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    is_trial        BOOLEAN NOT NULL DEFAULT FALSE,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_students    INT NOT NULL DEFAULT 6,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE INDEX idx_curricula_course_id ON curricula(course_id);

-- Cart: one open cart per parent
CREATE TABLE carts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'open', -- open | checked_out | abandoned
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE UNIQUE INDEX idx_carts_one_open_per_user ON carts(user_id) WHERE status = 'open';

CREATE TABLE cart_items (
    id              BIGSERIAL PRIMARY KEY,
    cart_id         BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    price_snapshot  DECIMAL(10,2) NOT NULL, -- price at time of adding; checkout re-validates against live price
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cart_id, student_id, class_id);
CREATE INDEX idx_cart_items_class_id ON cart_items(class_id);
```

### Modified tables

```sql
-- classes: add curriculum_id (nullable during migration, backfilled, then NOT NULL)
ALTER TABLE classes ADD COLUMN curriculum_id BIGINT REFERENCES curricula(id);
CREATE INDEX idx_classes_curriculum_id ON classes(curriculum_id);

-- Re-add scoped duplicate-enrollment guard (Decision D2)
CREATE UNIQUE INDEX idx_enrollment_students_no_dup
    ON enrollment_students(student_id, class_id)
    WHERE student_id IS NOT NULL;
```

### Existing tables reused as-is

`users`, `students`, `programs`, `departments`, `courses`, `classes` (aka `CourseClass`),
`enrollments`, `enrollment_students`, `waitlists`, `payments` — see the audit in §0 for their
current columns; no other structural changes needed.

---

## 3. Models

| Model | New/Existing | Key relationships to add |
|---|---|---|
| `Curriculum` | **new** | `belongsTo(Course)`, `hasMany(CourseClass, 'curriculum_id')` |
| `Cart` | **new** | `belongsTo(User)`, `hasMany(CartItem)` |
| `CartItem` | **new** | `belongsTo(Cart)`, `belongsTo(Student)`, `belongsTo(CourseClass, 'class_id')` |
| `CourseClass` | existing | add `belongsTo(Curriculum)` |
| `Course` | existing | add `hasMany(Curriculum)` |
| `Student`, `Enrollment`, `EnrollmentStudent`, `Payment`, `Waitlist`, `Program`, `Department` | existing | unchanged |

---

## 4. API endpoints

All under `/api`, auth via existing `Authorization: Bearer <token>` scheme
(`AuthenticateApiToken` middleware) unless noted.

| Method | Path | Controller::method | Notes |
|---|---|---|---|
| POST | `/auth/register` | `AuthController::register` | existing |
| POST | `/auth/login` | `AuthController::login` | existing |
| GET | `/students` | `StudentController::index` | existing — parent's own students |
| POST | `/students` | `StudentController::store` | existing |
| GET | `/catalog/locations` | `CourseController::getFilterOptions` (fix hardcoded values, §0.6) | public |
| GET | `/catalog/classes` | **new** `CatalogController::search` | filters: `location`, `age_group`, `course_id`; returns `Course → Curriculum → CourseClass` tree with live `available_seats` |
| GET | `/cart` | **new** `CartController::show` | returns current open cart, computed total |
| POST | `/cart/items` | **new** `CartController::addItem` | body: `{student_id, class_id}`; validates seat availability + duplicate (D2/D3) before insert |
| DELETE | `/cart/items/{id}` | **new** `CartController::removeItem` | |
| POST | `/checkout` | **new** `CheckoutController::checkout` | see §5 flow |
| GET | `/enrollments` | existing (`RegistrationController` / `AdminController` variants) | |
| POST | `/payments/webhook` | **new** `PaymentWebhookController::razorpay` | signature-verified server callback, no auth middleware (verified via HMAC signature instead) |

---

## 5. Business logic — checkout flow

```
POST /checkout
  1. Load parent's open cart; 404 if empty.
  2. BEGIN TRANSACTION
  3. For each cart_item:
       SELECT available_seats FROM classes WHERE id = :class_id FOR UPDATE   -- D3: row lock
       IF available_seats <= 0: ROLLBACK, return 409 { error: "class_full", class_id }
       IF duplicate enrollment exists for (student_id, class_id): ROLLBACK, return 409 { error: "duplicate_enrollment", ... }
  4. total = SUM(cart_items.price_snapshot re-validated against live curriculum.price)
  5. Create Enrollment (status = total > 0 ? 'pending_payment' : 'active')
  6. Create EnrollmentStudent rows for each cart item; decrement classes.available_seats
  7. IF total == 0:
       Mark enrollment 'active' immediately, skip payment entirely
       COMMIT
       Clear cart (status = 'checked_out')
       Return 200 { enrollment, requires_payment: false }
     ELSE:
       Create Payment row (status = 'pending'), create real Razorpay order via SDK
       COMMIT  -- enrollment exists in 'pending_payment' state even if Razorpay call fails after this point
       Return 200 { enrollment, requires_payment: true, razorpay_order_id, razorpay_key }
  8. Frontend opens Razorpay checkout with the order id.
  9. Razorpay calls POST /payments/webhook on success/failure (server-to-server, signature-verified
     with RAZORPAY_WEBHOOK_SECRET) — this is the source of truth for payment status, NOT the
     frontend's post-checkout redirect (which a user can navigate away from or spoof).
 10. Webhook handler: verify signature → update Payment.status → update Enrollment.status to
     'active' or 'payment_failed' → clear cart if active.
```

**Why the webhook and not just the frontend callback:** `PaymentController::processPayment`
today only fires from the frontend after Razorpay's client-side success callback — if the user
closes the tab before that fires, a real payment can succeed with no enrollment ever activated.
The webhook is server-to-server and doesn't depend on the browser staying open.

**Payment success but DB failure (edge case from the spec):** wrap step 6 in the same transaction
as the Payment row creation. If the transaction fails after the Razorpay order was created but
before commit, the order exists at Razorpay with no matching local enrollment — reconcile via a
scheduled job (`artisan payments:reconcile`) that polls Razorpay for orders with no matching local
`Payment.transaction_id` and either retries or flags for manual review. Do not attempt to
auto-refund without a human in the loop.

---

## 6. Example API responses

**`POST /cart/items`** — success
```json
{
  "cart_item": {
    "id": 42,
    "student": { "id": 7, "name": "Aiden Kumar" },
    "class": {
      "id": 103,
      "curriculum": "Intro Robotics — Sat AM",
      "location": "Thornhill",
      "date_time": "2026-08-02T10:00:00-04:00",
      "available_seats": 3
    },
    "price_snapshot": 149.00
  }
}
```

**`POST /cart/items`** — class full (edge case)
```json
{ "error": "class_full", "class_id": 103, "message": "This class has no seats remaining." }
```

**`POST /checkout`** — free trial, no payment needed
```json
{
  "enrollment": { "id": 501, "status": "active", "total_amount": 0 },
  "requires_payment": false
}
```

**`POST /checkout`** — paid, payment required
```json
{
  "enrollment": { "id": 502, "status": "pending_payment", "total_amount": 149.00 },
  "requires_payment": true,
  "razorpay_order_id": "order_LKj3n2K9dXpQ",
  "razorpay_key": "rzp_live_xxxxxxxx"
}
```

**`POST /checkout`** — duplicate enrollment (edge case)
```json
{
  "error": "duplicate_enrollment",
  "student_id": 7,
  "class_id": 103,
  "message": "Aiden Kumar is already enrolled in this class."
}
```

---

## 7. Edge cases → handling summary

| Edge case | Handling |
|---|---|
| Class already full | `SELECT ... FOR UPDATE` inside checkout transaction; 409 before any row is written |
| Duplicate enrollment attempt | Partial unique index (D2) as last line of defense + explicit pre-check for a clean error message |
| Cart contains invalid/stale class (deleted or seats changed since add) | Checkout re-validates every `class_id` and re-fetches live price/seats — never trusts `price_snapshot` for the charge amount, only for display |
| Payment success, DB failure | Transaction wraps enrollment + payment row together; reconciliation job catches orphaned Razorpay orders |
| Concurrent booking (two parents, last seat) | Postgres row lock (D3) makes the second transaction wait, then see `available_seats = 0` and fail cleanly — no overbooking possible even without Redis |
| Mixed cart (free + paid items) | Single enrollment, single total; if total > 0 the whole cart goes through Razorpay (no partial free-checkout-then-pay-separately split, to avoid two enrollments for one cart) |

---

## 8. Suggested build order

1. **Migrations**: `curricula`, `cart_items`/`carts`, `classes.curriculum_id`, partial unique index (D2). Write the `SchoolClass → Curriculum` backfill migration with a `--dry-run` flag first.
2. **Models**: `Curriculum`, `Cart`, `CartItem` + relationship wiring on existing models.
3. **CatalogController**: read-only search endpoint, reusing `CourseController` query patterns.
4. **CartController**: add/remove/view, with seat + duplicate validation at add-time (fail fast, don't wait for checkout).
5. **Razorpay integration**: add `razorpay/razorpay` composer package, `config/services.php` `razorpay` block, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` env vars, real order creation replacing the `uniqid()` placeholder.
6. **CheckoutController**: the transactional flow in §5.
7. **PaymentWebhookController**: signature verification + reconciliation job.
8. **Cleanup**: fix `AdminController::filterOptions()` hardcoded values (§0.6); deprecate `SchoolClassController` once the backfill is verified.

Each step is independently testable before moving to the next — do not build all of this in one
untested branch.
