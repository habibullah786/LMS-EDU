# Free Trial Enrollment Flow — Orbund API Integration

This document describes the complete multi-step trial enrollment flow used across Exceed Robotics trial pages. The flow is built on top of the **Orbund SIS API** and is shared across robotics, coding, game, and AI trial variants.

---

## Overview

The enrollment is a 7-step wizard. Each step is a separate WordPress page template that uses jQuery AJAX to communicate with the Orbund API.

```
[1] Trial Registration Form
        ↓  (localStorage: registration_detail)
[2] Choose Class (Class List)
        ↓  (sessionStorage: cartStudents)
[3] Review Cart
        ↓  (redirect)
[4] Login / Register (Orbund account)
        ↓
[5] Checkout (Payment Plans)
        ↓  (redirect to billing if fee > 0)
[6] Billing & Payment
        ↓  (sessionStorage: thankYouData)
[7] Thank You
```

---

## API Configuration

Defined in `assets/trial-2-0/js/custom.js`:

| Variable    | Value                                  |
|-------------|----------------------------------------|
| `base_url`  | `https://exceed.orbundsis.com/api`     |
| `clientId`  | `exceed`                               |
| `secretKey` | `e0b6d2f0-f73a-4af2-bd3a-5b88872a3c5e` |

All API requests pass `clientId`, `secretKey`, and `sessionId` as HTTP headers.

---

## Browser Storage Map

| Key                  | Storage         | Set in step | Used in step     |
|----------------------|-----------------|-------------|------------------|
| `sessionId`          | `localStorage`  | 1           | All steps        |
| `registration_detail`| `localStorage`  | 1           | 2                |
| `name`               | `localStorage`  | 2           | 7                |
| `parentEmail`        | `localStorage`  | 2           | 4, 7             |
| `phone`              | `localStorage`  | 2           | 4                |
| `age`                | `localStorage`  | 2           | 5                |
| `level_id`           | `localStorage`  | 2           | 5, 6             |
| `location`           | `localStorage`  | 2           | —                |
| `semester`           | `localStorage`  | 2           | —                |
| `page_url`           | `localStorage`  | 2           | 5 (thank you routing) |
| `cartStudents`       | `sessionStorage`| 2, 3        | 3                |
| `minimunAgeDate`     | `sessionStorage`| 2           | 3                |
| `couponCode`         | `sessionStorage`| 3           | 3                |
| `dueObj`             | `sessionStorage`| 5           | 7                |
| `paymentObj`         | `sessionStorage`| 5           | 6                |
| `thankYouData`       | `sessionStorage`| 6           | 7                |

**Session expiry (error code 605):** Clears all `localStorage` and `sessionStorage`, redirects to `/free-trial/`.

---

## Step-by-Step Flow

---

### Step 1 — Trial Registration Form

**Template:** `robotics-trial-2-0.php`  
**JS:** `assets/trial-2-0/js/registration-detail.js`  
**Page slug:** `/free-trial/` (robotics variant)

#### On page load

1. Calls `sessionId()`:
   - `GET /public/session-id`
   - Stores result in `localStorage.sessionId`
2. Calls `getSemester()`:
   - `GET /cart/filter/semester` (header: `sessionId`)
   - Populates the hidden `#semester` field options

#### Hidden form fields (hardcoded per variant)

| Field       | Value                                            |
|-------------|--------------------------------------------------|
| `level_id`  | `4000281` (Robotics Trial)                       |
| `semester`  | `4000979`                                        |
| `page_url`  | `robotics_trial` (controls thank-you routing)    |
| `subject`   | `Robotics Trial Registration Lead - Trial Page`  |

---

#### Orbund API Parameter Reference — All Values

##### `semesterId` (static across all variants)

| Value     | Notes                    |
|-----------|--------------------------|
| `4000979` | Current active semester  |

##### `campusType` — Location options (same across all variants)

| Value | Label           |
|-------|-----------------|
| `1`   | Thornhill       |
| `3`   | Richmond Hill   |
| `6`   | Yonge & Lawrence |

##### `programId` — Child Age options

| Value     | Label           | Robotics | Coding |
|-----------|-----------------|----------|--------|
| `4001270` | 7 Years Old     | ✓        | ✓      |
| `4001271` | 8 Years Old     | ✓        | ✓      |
| `4001272` | 9–11 Years Old  | ✓        | ✓      |
| `4001273` | 12–15 Years Old | ✓ (Robotics only) | — |
| `4001274` | 12–15 Years Old | —        | ✓ (Coding only) |

> Note: Robotics and Coding use **different** `programId` values for the 12–15 age group.

##### `levelId` — Course level

| Value     | Variant                          | How set                                         |
|-----------|----------------------------------|-------------------------------------------------|
| `4000281` | Robotics Trial / Coding (ages 7–11) | Hardcoded in Robotics; default in Coding JS  |
| `4000282` | Coding (age 12–15 only)          | Set dynamically via `#age` change event in Coding page |

> In `coding-trial-2-0.php`, `level_id` starts empty and is set by this inline script:
> ```js
> $('#age').on('change', function() {
>     $('#level_id').val($(this).val() === '4001274' ? '4000282' : '4000281');
> });
> ```

##### `programLevelId`

| Value | Notes                          |
|-------|--------------------------------|
| `-1`  | Always hardcoded in `class.js` |

#### On submit — `submitRegistration()`

1. Validates: name, email (regex), phone, level_id, age, location, semester
2. WordPress AJAX: `POST /wp-admin/admin-ajax.php`
   - `action: all_enrollment_data_submission`
   - Sends lead data (triggers a lead email server-side)
3. On success: stores `registration_detail` object in `localStorage`
4. Redirects to `./trial-choose-class/`

---

### Step 2 — Choose Class

**Template:** `trial-list-2-0.php`  
**JS:** `assets/trial-2-0/js/class.js`  
**Page slug:** `/trial-choose-class/`

#### On page load — `getClassList()`

- Reads `registration_detail` from `localStorage`; redirects to `/free-trial/` if missing
- `GET /cart/multiple/program-list-with-courses`
  - Params: `campusType` (location), `levelId` (level_id), `programId` (age), `semesterId`
- Renders a DataTable of available trial classes:
  - Columns: Trial Class Option, Date, Time, Age, Action button

#### Class availability

- `element.allowToSelectClass === true` → shows **"Add to cart"** button
- Otherwise → shows `element.statusMessage` in red (e.g., "Class Full")

#### Adding to cart — `openStudentModal(classId, minimumAge)`

- Opens a Bootstrap modal
- If `minimumAge > 0`: sets `max` date attribute on DOB inputs using `moment().subtract(n, 'years')`
- Supports multiple children via **"Add Sibling"** which clones `.form-block-sample`

#### On modal submit — `submitForm()`

- Collects all first names, last names, DOBs from form
- Builds `cartStudents` array and stores in `sessionStorage`:
  ```json
  [
    {
      "uniqueId": 1700000000000,
      "firstName": "...",
      "lastName": "...",
      "dateOfBirth": "YYYY-MM-DD",
      "classIds": ["classId"]
    }
  ]
  ```
- Redirects to `./trial-review-selection/`

---

### Step 3 — Review Cart

**Template:** `trial-cart-2-0.php`  
**JS:** `assets/trial-2-0/js/cart.js`  
**Page slug:** `/trial-review-selection/`

#### On page load — `getCartData()`

- Reads `cartStudents` from `sessionStorage`; shows empty state if empty
- `POST /cart/multiple/display-cart`
  - Body: `{ displayCartStudents: [...], couponCode: "" }`
- Merges `classes` + `enrolledClasses`, deduplicates by `classId` using `findOcc()`
- Renders cart table: Trial Class Option, No of Children, Date, Time, Actions

#### Cart actions

| Action               | Function                                 |
|----------------------|------------------------------------------|
| Add Sibling          | `openStudentModal(classId)` → adds to same `classId` in `cartStudents` |
| Remove (1 student)   | `removeFromCart(uniqueId)` → splices from `cartStudents` |
| Remove (multiple)    | `openShowStudentModal(classId)` → per-student removal |
| View children        | `displayStudentsByClassId(classId)` → read-only modal |
| Apply coupon         | `couponCodeAdd()` → re-calls `getCartData(couponCode)` |

#### Pricing rows (from `cartSummary`)

- Sub-Total, HST, Discount (if coupon applied), Total

#### "Proceed To Checkout"

- `submitCart()` → redirects to `./trial-registration/`

---

### Step 4 — Login / Register

**Templates:** `trial-login-2-0.php` / `trial-register-2-0.php`  
**JS:** `assets/trial-2-0/js/login.js`  
**Page slugs:** `/trial-login/` / `/trial-registration/`

Both templates load the same `login.js`. Fields are rendered dynamically from the API.

#### Login

1. `getLoginFields()` → `GET /cart/registration/multiple/contact/login/fields`
   - Pre-fills `username` with `localStorage.parentEmail`
2. `submitLoginForm()` → `POST /cart/registration/multiple/contact/login`
   - Body: `{ username, password }`
   - Success → `./trial-checkout/`

#### Register (Create Account)

1. `getRegistrationFields()` → `GET /cart/registration/multiple/contact/fields`
   - Pre-fills `username` and `email` with `localStorage.parentEmail` (readonly)
   - Pre-fills `cellPhone` with `localStorage.phone`
   - Hides fields: `middleName`, `homePhone`, `campusCode`
2. `submitRegistrationForm()` → `POST /cart/registration/multiple/contact/register`
   - Body: `{ username, password, firstName, lastName, email, cellPhone, profileFieldValues: { XP4005834: imthe } }`
   - Success → `./trial-checkout/`

---

### Step 5 — Checkout

**Template:** `trial-checkout-2-0.php`  
**JS:** `assets/trial-2-0/js/checkout.js`  
**Page slug:** `/trial-checkout/`

#### On page load sequence

1. `saveGroupEnrollment()`:
   - `POST /cart/registration/multiple/contact/save-group-enrollment`
   - Body: `{ levelId: -1, programId: -1, programLevelId: -1 }`
   - Attaches the cart to the logged-in contact in Orbund

2. `collectPayment()`:
   - `GET /cart/payment/multiple/collect-payment-info?regType=2`

#### Two outcomes from `collectPayment()`

**A — Free trial (no payment):**
- `result.classes` is empty
- Redirects to a thank-you page based on `localStorage.page_url`:

  | `page_url` value                        | Redirect destination                         |
  |-----------------------------------------|----------------------------------------------|
  | `robotics_trial`                        | `./trial-robotics-classes-thankyou/`         |
  | `robotics_trial_classes_thornhill`      | `./robotics-trial-thankyou-thornhill/`       |
  | `robotics_trial_classes_richmond_hill`  | `./robotics-trial-thankyou-richmond-hill/`   |
  | `robotics_trial_classes_yonge_lawrence` | `./robotics-trial-thankyou-yonge-lawrence/`  |
  | `robotics_trial_internal`               | `./registration-trial-robotics-thankyou/`    |
  | `coding_trial`                          | `./trial-coding-classes-thankyou/`           |
  | `coding_trial_classes_thornhill`        | `./coding-trial-thankyou-thornhill/`         |
  | *(default)*                             | `./trial-thankyou/`                          |
  
  *(v2 and v3 location variants also exist — see `checkout.js` switch statement)*

**B — Paid enrollment:**
- Renders class/student rows with payment plan radio buttons
- `paymentSelect()` → `POST /cart/payment/multiple/class-invoice-installments`
  - Body: `{ classId, paymentPlanId, studentId }`
  - Updates payment schedule table and Today's Payment amount
- Shows: Sub-Total, HST, Discount, Total, Today's Payment
- Terms & conditions checkbox is required
- **"Checkout"** → `./course-billing/`

---

### Step 6 — Billing & Payment

**JS:** `assets/trial-2-0/js/billing.js`  
**Page slug:** `/course-billing/`

#### On page load — `getBillingInfo()`

- `GET /cart/payment/multiple/billing-info`
- Dynamically renders:
  - Payment method dropdown
  - Billing information fields (address, country, state, etc.)
  - Payment information fields (credit card details)
- Country change triggers `GET /public/states?countryCode=XX` to refresh state dropdown

#### On submit — `payNow()`

- Validates billing + payment forms
- `POST /cart/payment/multiple/process-payment`
  - Body: merged billing + payment form data + `paymentMethod`
- On success: stores API response in `sessionStorage.thankYouData`
- Redirects based on `localStorage.level_id`:

  | `level_id` | Redirect                      |
  |------------|-------------------------------|
  | `4000265`  | `./thankyou-robotics-paid/`   |
  | `4000308`  | `./thankyou-python-paid/`     |
  | `4000266`  | `./thankyou-ai-paid/`         |
  | *(default)*| `./course-thankyou/`          |

---

### Step 7 — Thank You

**Template:** `trial-thankyou-2-0.php`  
**JS:** `assets/trial-2-0/js/thankyou.js`  
**Page slug:** `/trial-thankyou/` (and all location/variant-specific slugs)

#### On page load — `getThankyou()`

1. Checks `sessionStorage.thankYouData` (set by billing step)
   - If present: uses it directly and removes it from storage
   - If absent: `GET /cart/multiple/thankyou`
2. Renders confirmation table: Class, Student Name, Date, Time, Tuition Fee
3. Sends confirmation email via WordPress AJAX:
   - `action: trial_registration_confirmation_email`
   - Sends `emailContent` (HTML table), `parentEmail`, `name`
4. Print button calls `printThankYou()` (swaps `document.body.innerHTML`)

---

## Full Orbund API Endpoint Reference

| Method | Endpoint | Step | Purpose |
|--------|----------|------|---------|
| GET    | `/public/session-id` | 1 | Obtain session token |
| GET    | `/cart/filter/semester` | 1 | List available semesters |
| GET    | `/cart/multiple/program-list-with-courses` | 2 | Fetch available trial classes |
| POST   | `/cart/multiple/display-cart` | 3 | Display cart with pricing & summary |
| GET    | `/cart/registration/multiple/contact/login/fields` | 4 | Get dynamic login form fields |
| GET    | `/cart/registration/multiple/contact/fields` | 4 | Get dynamic registration form fields |
| POST   | `/cart/registration/multiple/contact/login` | 4 | Authenticate existing parent account |
| POST   | `/cart/registration/multiple/contact/register` | 4 | Create new parent account |
| POST   | `/cart/registration/multiple/contact/save-group-enrollment` | 5 | Link cart to Orbund contact |
| GET    | `/cart/payment/multiple/collect-payment-info` | 5 | Get payment plans & invoice data |
| POST   | `/cart/payment/multiple/class-invoice-installments` | 5 | Recalculate installments on plan change |
| GET    | `/cart/payment/multiple/billing-info` | 6 | Get billing & payment form fields |
| GET    | `/public/states` | 6 | Get states for selected country |
| POST   | `/cart/payment/multiple/process-payment` | 6 | Process credit card payment |
| GET    | `/cart/multiple/thankyou` | 7 | Get confirmed enrollment data |

---

## WordPress AJAX Hooks (Server-Side)

| `action` value                         | Triggered in | Purpose |
|----------------------------------------|--------------|---------|
| `all_enrollment_data_submission`       | Step 1       | Send lead notification email |
| `trial_registration_confirmation_email`| Step 7       | Send enrollment confirmation email to parent |

---

## Error Handling

| Error Code | Meaning | Action |
|------------|---------|--------|
| `605`      | Session expired | `removeAllAndRedirect()` — clears all storage, redirects to `/free-trial/` |
| `103`      | Validation error | `alert(message)` — may also clear cart and redirect to class list |
| `104`      | Business logic error | `alert(message)` |
