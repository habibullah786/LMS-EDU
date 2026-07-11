# LMS-EDU: Ed-Tech Platform MVP Requirements

> 🎯 **PHASE 1 STATUS**: ✅ Landing Page & Authentication COMPLETED
> 
> **Quick Start Documents**:
> - 📖 [FRONTEND_QUICKSTART.md](./FRONTEND_QUICKSTART.md) - Get up and running in 2 minutes
> - 📦 [FRONTEND_IMPLEMENTATION.md](./FRONTEND_IMPLEMENTATION.md) - Detailed file structure and build summary
> - 📁 [frontend/README.md](./frontend/README.md) - Frontend project documentation

---

## Project Overview
- **Project Name**: LMS-EDU (Learning Management System - Education)
- **Description**: Complete ed-tech platform MVP for teaching Coding and Robotics to students aged 7–17
- **Target Users**: Parents, Students (7-17 years)
- **Start Date**: 27 April 2026
- **MVP Completion**: TBD

---

## 🎯 CORE BUSINESS LOGIC

### Platform Purpose
Teaching Coding and Robotics to students aged 7–17 with flexible scheduling across Indian locations.

### User Flow

**Step 1: Registration & Login**
- Parent registers and logs in to the platform
- Mock session/token-based authentication

**Step 2: Selection Filters**
Parent selects:
- **Location**: Delhi, Bengaluru, Kolkata
- **Age Group**: 7–8, 9–11, 12+
- **Course**: Coding, Robotics
- **Class Type**: Trial (Free) or Paid
- **Semester**: APR-JUN, JUL-SEP, OCT-DEC, JAN-MAR

**Step 3: Browse Available Classes**
- System displays available CLASSES based on selections
- Shows only classes with available slots
- Hierarchy: Location → Age Group → Course → Curriculum → Classes

**Step 4: Student & Class Selection**
- Parent selects one or multiple classes
- Parent assigns one or multiple students to classes
- System prevents duplicate student enrollment in same class

**Step 5: Add to Cart**
- Multiple students and classes can be added to cart
- Cart shows total price

**Step 6: Checkout**
- If total = ₹0 → Direct enrollment (skip payment)
- If total > ₹0 → Simulate Razorpay payment

**Step 7: Confirmation**
- Create enrollments
- Reduce available class slots
- Show Thank You page

---

## 📚 DATA STRUCTURE (IN-MEMORY)

All data stored in-memory (arrays/Maps) initially. Structure designed for easy database migration.

### Users (Parents)
```
{
  id: uuid,
  email: string,
  password: string (hashed),
  name: string,
  phone: string,
  created_at: timestamp
}
```

### Students
```
{
  id: uuid,
  parent_id: uuid,
  name: string,
  age: number,
  date_of_birth: date,
  created_at: timestamp
}
```

### Courses
```
{
  id: uuid,
  name: string (Coding / Robotics),
  description: string,
  created_at: timestamp
}
```

### Curriculum
```
{
  id: uuid,
  name: string,
  course_id: uuid,
  age_group: string (7-8, 9-11, 12+),
  location: string (Delhi, Bengaluru, Kolkata),
  is_trial: boolean,
  price: decimal (0 for trial),
  max_students: integer (default: 6),
  semester: string (APR-JUN, JUL-SEP, OCT-DEC, JAN-MAR),
  created_at: timestamp
}
```

### Classes
```
{
  id: uuid,
  curriculum_id: uuid,
  date_time: datetime,
  available_slots: integer,
  instructor: string,
  created_at: timestamp
}
```

### Cart
```
{
  parent_id: uuid,
  items: [
    {
      student_id: uuid,
      class_id: uuid,
      curriculum_id: uuid,
      price: decimal,
      added_at: timestamp
    }
  ]
}
```

### Enrollments
```
{
  id: uuid,
  student_id: uuid,
  class_id: uuid,
  curriculum_id: uuid,
  parent_id: uuid,
  enrolled_at: timestamp,
  status: enum (active, completed, cancelled)
}
```

---

## ⚙️ BACKEND (LARAVEL)

### Architecture
- **Framework**: Laravel 11+
- **Storage**: In-memory (arrays/collections) — easily replaceable with PostgreSQL
- **Pattern**: Service-based architecture with DTOs and validation

### Modules/Routes

#### 1. **Auth Module**
**Endpoints:**
- `POST /auth/register` - Parent registration
- `POST /auth/login` - Parent login
- `POST /auth/logout` - Parent logout
- `GET /auth/me` - Current user profile

**Features:**
- Email validation
- Password hashing (bcrypt)
- Session/token-based authentication (no JWT required for MVP)
- Mock session storage

**Validations:**
- Email format and uniqueness
- Password strength
- Required fields

---

#### 2. **Students Module**
**Endpoints:**
- `GET /students` - List parent's students
- `POST /students` - Create student
- `GET /students/{id}` - Get student details
- `PUT /students/{id}` - Update student
- `DELETE /students/{id}` - Delete student

**Features:**
- Parent can manage multiple students
- Age validation (7-17 years)
- Soft delete support

---

#### 3. **Courses Module**
**Endpoints:**
- `GET /courses` - List all courses
- `GET /courses/{id}` - Get course details

**Features:**
- Pre-loaded courses (Coding, Robotics)
- Read-only for MVP

---

#### 4. **Curriculum Module**
**Endpoints:**
- `GET /curriculum` - List curriculum with filters
  - Query params: `location`, `age_group`, `course`, `is_trial`, `semester`
- `GET /curriculum/{id}` - Get curriculum details

**Features:**
- Filter by location, age group, course, trial status, semester
- Return only curriculum with available classes
- Sorted by price and popularity

---

#### 5. **Classes Module**
**Endpoints:**
- `GET /classes` - Search available classes
  - Query params: `location=`, `age=`, `course=`, `curriculum_id=`
- `GET /classes/{id}` - Get class details
- `GET /classes/{id}/availability` - Check available slots

**Features:**
- Filter classes by curriculum attributes
- Return only classes with available_slots > 0
- Show instructor, date_time, available slots
- Validate seat availability

---

#### 6. **Cart Module**
**Endpoints:**
- `GET /cart` - Get current cart
- `POST /cart/add` - Add student-class pair to cart
  ```
  {
    student_id: uuid,
    class_id: uuid
  }
  ```
- `DELETE /cart/remove/{item_id}` - Remove item from cart
- `DELETE /cart/clear` - Clear entire cart
- `GET /cart/total` - Get cart summary (items count, total price)

**Business Logic:**
- Prevent duplicate entries (same student in same class)
- Calculate total price dynamically
- Validate student & class existence
- Check class availability before adding

---

#### 7. **Checkout Module**
**Endpoints:**
- `POST /checkout` - Process checkout
  ```
  {
    payment_method: "mock" | "razorpay",
    items: [] // Current cart items
  }
  ```
- `POST /checkout/payment/callback` - Simulate payment success (mock Razorpay)

**Business Logic:**
- If total = ₹0 → Direct enrollment (skip payment)
- If total > ₹0 → Generate payment request (mock Razorpay)
- Simulate payment success after 2-3 seconds
- Prevent race conditions: Lock class slots during checkout
- Validate seat availability one more time
- Return transaction ID and enrollment details

**Payment Simulation:**
- Mock Razorpay response
- Status: success / failed
- Transaction ID: random UUID

---

#### 8. **Enrollments Module**
**Endpoints:**
- `GET /enrollments` - List parent's enrollments
- `GET /enrollments/{id}` - Get enrollment details
- `POST /enrollments` - Create enrollment (called by checkout)
- `GET /enrollments/student/{student_id}` - Enrollments of specific student

**Business Logic:**
- Created only after successful checkout
- Reduce class available_slots by 1
- Prevent enrollment if slots exhausted
- Prevent duplicate enrollment (same student, same class)
- Validate seat availability

---

### Services (Business Logic)

#### AuthService
- register(data): User
- login(email, password): User
- validateToken(token): User | null

#### StudentService
- create(parent_id, data): Student
- getByParent(parent_id): Student[]
- getById(id): Student
- update(id, data): Student
- delete(id): void

#### CurriculumService
- getAll(filters): Curriculum[]
- getById(id): Curriculum
- filter(location, age_group, course, is_trial, semester): Curriculum[]

#### ClassService
- getAvailable(curriculum_id): Class[]
- search(location, age_group, course): Class[]
- getById(id): Class
- getAvailableSlots(id): integer
- checkAvailability(id): boolean

#### CartService
- add(parent_id, student_id, class_id): Cart
- remove(parent_id, item_id): Cart
- clear(parent_id): void
- getCart(parent_id): Cart
- validate(items): { valid: boolean, errors: string[] }
- getTotal(parent_id): decimal

#### CheckoutService
- validateCheckout(parent_id, items): boolean
- initializePayment(items, total): { transaction_id, redirect_url }
- processPayment(transaction_id): { status, message }
- completeCheckout(parent_id, items, transaction_id): [ Enrollment ]

#### EnrollmentService
- create(student_id, class_id, curriculum_id, parent_id): Enrollment
- getByParent(parent_id): Enrollment[]
- getByStudent(student_id): Enrollment[]
- preventDuplicate(student_id, class_id): boolean
- reduceSlots(class_id): void

---

### Data Transfer Objects (DTOs)

```
LoginDTO: email, password
RegisterDTO: email, password, name, phone
StudentDTO: name, age, date_of_birth
CartItemDTO: student_id, class_id
CheckoutDTO: payment_method, items
EnrollmentDTO: student_id, class_id, curriculum_id
```

---

### Validation Rules

#### User Registration
- Email: required, unique, valid format
- Password: required, min 8 chars, contains uppercase, number, special char
- Name: required, string, max 100
- Phone: required, valid Indian format

#### Student Creation
- Name: required, string, max 100
- Age: required, integer, 7-17
- Date of Birth: required, valid date

#### Cart Add
- Student ID: required, exists, belongs to parent
- Class ID: required, exists, has available slots
- No duplicate: (student, class) pair not already in cart

#### Checkout
- Cart not empty
- All students exist and belong to parent
- All classes exist and have available slots
- Total >= 0

---

## Functional Requirements

### 1. Authentication & User Management
- **Description**: Parent registration, login, session management
- **Priority**: High
- **Acceptance Criteria**: 
  - [ ] Parent can register with email and password
  - [ ] Parent can login with valid credentials
  - [ ] Parent can logout
  - [ ] Passwords are securely hashed
  - [ ] Session persists across page navigation

### 2. Student Management
- **Description**: Parent can add and manage multiple students
- **Priority**: High
- **Acceptance Criteria**: 
  - [ ] Parent can create student profile
  - [ ] Parent can view all their students
  - [ ] Parent can update student details
  - [ ] Parent can delete student
  - [ ] Age validation (7-17 years)

### 3. Class Search & Filtering
- **Description**: Parents can search and filter available classes
- **Priority**: High
- **Acceptance Criteria**: 
  - [ ] Filter by location (Delhi, Bengaluru, Kolkata)
  - [ ] Filter by age group (7-8, 9-11, 12+)
  - [ ] Filter by course (Coding, Robotics)
  - [ ] Filter by semester (APR-JUN, JUL-SEP, OCT-DEC, JAN-MAR)
  - [ ] Show only classes with available slots
  - [ ] Display class details (instructor, date/time, price)

### 4. Cart Management
- **Description**: Add multiple students to multiple classes
- **Priority**: High
- **Acceptance Criteria**: 
  - [ ] Add student-class pairs to cart
  - [ ] Remove items from cart
  - [ ] Clear entire cart
  - [ ] Prevent duplicate entries
  - [ ] Show cart summary (items count, total price)
  - [ ] Cart persists (per session)

### 5. Checkout & Payment
- **Description**: Process checkout with mock payment
- **Priority**: High
- **Acceptance Criteria**: 
  - [ ] If total = ₹0 → Direct enrollment
  - [ ] If total > ₹0 → Show payment interface
  - [ ] Mock Razorpay payment processing
  - [ ] Prevent race conditions (slot locking)
  - [ ] Handle payment success/failure
  - [ ] Return transaction ID

### 6. Enrollment & Confirmation
- **Description**: Create enrollments and reduce class slots
- **Priority**: High
- **Acceptance Criteria**: 
  - [ ] Enrollments created after checkout
  - [ ] Class available slots reduced by 1 per enrollment
  - [ ] Prevent duplicate enrollments
  - [ ] Prevent overbooking (max 6 per class)
  - [ ] Display Thank You page with enrollment details
  - [ ] Parent can view enrollments in dashboard

### 7. Trial Classes
- **Description**: Offer free trial classes
- **Priority**: Medium
- **Acceptance Criteria**: 
  - [ ] Trial classes have price = ₹0
  - [ ] Trial classes can be mixed with paid in cart
  - [ ] Checkout works seamlessly with mixed cart

---

## Non-Functional Requirements

- **Performance**: API response time < 200ms; Handle 100+ concurrent users
- **Security**: Password hashing, input validation, prevent SQL injection (when migrating to DB)
- **Scalability**: In-memory data structure easily replaceable with PostgreSQL
- **Data Integrity**: Prevent race conditions during checkout, prevent overbooking
- **Maintainability**: Clean code, service-based architecture, easy to test

---

## Technical Stack

- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Laravel 11+
- **Database**: In-memory storage (designed for PostgreSQL migration)
- **Storage**: Local storage → PostgreSQL (later)
- **Authentication**: Session-based (token for API)
- **Payment**: Mock Razorpay
- **Styling**: Tailwind CSS
- **API Communication**: Fetch API / Axios

---

## 🎨 FRONTEND (NEXT.JS)

### ✅ PHASE 1: LANDING PAGE & AUTHENTICATION (COMPLETED)

**Status**: ✅ Landing page and login/register functionality implemented

#### Implemented Components:

**1. Landing Page (`/`)**
- Beautiful gradient hero section with animated background
- Compelling value proposition
- Key statistics (5K+ students, 50+ instructors, 3 cities, 8+ years)
- Features showcase (6 feature cards)
- Course overview section (Coding & Robotics)
- Call-to-action for free trial
- Integrated login/register modal
- Responsive footer

**2. Login & Register Modal**
- Two-tab interface (Login | Register)
- Email/password validation
- Password confirmation on register
- Phone number field
- Demo credentials: 
  - Email: `parent@example.com`
  - Password: `Password123!`
- Real-time error messages
- Loading states with spinners
- Auto-redirect to dashboard on success
- Beautiful Tailwind CSS styling

**3. Authentication Context (`AuthContext.tsx`)**
- User state management
- Login & register functions
- Logout functionality
- Token & user data persistence in localStorage
- Error handling
- Loading states
- `useAuth()` hook for easy access

**4. Navigation Component**
- Sticky header
- Logo with gradient background
- Desktop menu (Features, Courses, Contact)
- Auth-aware buttons (Login/Dashboard)
- Mobile responsive with hamburger menu
- User greeting when authenticated

**5. Dashboard Page (`/dashboard`)**
- Welcome section with parent's name
- Three quick action cards:
  - Manage Students
  - Browse Classes
  - View Enrollments
- Step-by-step guide (1-4) for getting started
- Call-to-action section
- Responsive layout

#### Design System

**Color Palette**:
- Primary (Blue): #0066FF
- Secondary (Orange): #FF6B35
- Accent (Yellow): #FFB627
- Dark: #1A1A2E
- Light: #F5F7FA

**Components Created**:
- `.btn-primary` - Primary CTA buttons
- `.btn-secondary` - Secondary action buttons
- `.btn-outline` - Outlined buttons
- `.input-field` - Form inputs with focus states
- `.section-container` - Max-width wrapper
- `.text-gradient` - Gradient text effect

**Animations**:
- Fade-in on scroll
- Slide-up on page load
- Smooth transitions on hover
- Spinning loader for async operations

#### Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                 # Root layout with AuthProvider
│   ├── page.tsx                   # Landing page (IMPLEMENTED)
│   ├── globals.css                # Global styles & Tailwind
│   ├── context/
│   │   └── AuthContext.tsx        # Auth state & hooks (IMPLEMENTED)
│   ├── components/
│   │   ├── Navigation.tsx         # Top navigation (IMPLEMENTED)
│   │   └── LoginModal.tsx         # Login/Register form (IMPLEMENTED)
│   ├── dashboard/
│   │   └── page.tsx              # Dashboard (IMPLEMENTED)
│   ├── search/
│   │   └── page.tsx              # Class search (PENDING)
│   ├── cart/
│   │   └── page.tsx              # Shopping cart (PENDING)
│   ├── checkout/
│   │   └── page.tsx              # Checkout (PENDING)
│   ├── students/
│   │   └── page.tsx              # Student management (PENDING)
│   ├── enrollments/
│   │   └── page.tsx              # View enrollments (PENDING)
│   └── thank-you/
│       └── page.tsx              # Enrollment confirmation (PENDING)
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js            # Tailwind theme
├── next.config.js                # Next.js config
├── postcss.config.js             # PostCSS plugins
├── .env.local                    # API URL configuration
├── .gitignore                    # Git ignore rules
└── README.md                     # Frontend documentation
```

#### Key Features

✅ **Responsive Design**
- Mobile-first approach
- Desktop, tablet, and mobile optimized
- Touch-friendly buttons and inputs

✅ **Authentication Flow**
- Parent registration with validation
- Secure login with error handling
- Token-based auth with localStorage
- Auto-redirect based on auth state

✅ **Modern UX**
- Smooth animations
- Loading indicators
- Clear error messages
- Success feedback

✅ **TypeScript**
- Full type safety
- React hooks typing
- Context typing

✅ **Tailwind CSS**
- Utility-first approach
- Custom components layer
- Responsive breakpoints
- Dark mode ready (can be added)

#### Configuration

File: `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Change the API URL to match your Laravel backend:

**Development**:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Production**:
```
NEXT_PUBLIC_API_URL=https://api.lmsedu.com/api
```

#### Installation & Running

**Install dependencies**:
```bash
cd frontend
npm install
```

**Run development server**:
```bash
npm run dev
```

Open http://localhost:3000 and see the landing page!

**Build for production**:
```bash
npm run build
npm start
```

---

### Pages & Routes (DETAILED SPECIFICATIONS)

#### 1. `/login`
- Email and password login form
- "Don't have an account?" link to register
- Form validation
- Error messages
- Redirect to dashboard on success

#### 2. `/register`
- Registration form (email, password, name, phone)
- Terms & conditions checkbox
- Form validation with real-time feedback
- Error handling
- Redirect to login on success

#### 3. `/dashboard`
- Welcome message with parent name
- Quick stats (enrolled students, active enrollments)
- List of students with edit/delete options
- List of recent enrollments
- "Start Shopping" button to /search

#### 4. `/search`
- Filter panel:
  - Location dropdown (Delhi, Bengaluru, Kolkata)
  - Age group checkbox (7-8, 9-11, 12+)
  - Course checkbox (Coding, Robotics)
  - Semester dropdown
  - Trial toggle
- Class search results:
  - Class cards showing:
    - Course name
    - Age group
    - Instructor
    - Date & time
    - Available slots
    - Price
    - "Add to Cart" button
- Student selector dropdown (on click, show available students)
- Responsive grid layout (3 cols desktop, 1 col mobile)

#### 5. `/cart`
- Cart items table/cards:
  - Student name
  - Class details (date, time, course)
  - Price
  - Remove button
- Cart summary:
  - Items count
  - Subtotal
  - Trial courses (₹0)
  - Discount (if any)
  - **Total price**
- Buttons:
  - "Continue Shopping" → /search
  - "Proceed to Checkout" → /checkout
- Empty cart message

#### 6. `/checkout`
- Order summary (same as cart)
- If total = 0:
  - "Complete Enrollment" button
  - Enroll directly on click
- If total > 0:
  - Payment method selection (Razorpay mock)
  - Payment form / redirect
  - Processing state with spinner
  - Success message with transaction ID
  - Error handling with retry button

#### 7. `/thank-you`
- Confirmation message
- Enrollment details:
  - Transaction ID
  - Total paid
  - Students enrolled
  - Classes & dates
- Downloadable receipt (optional)
- "View Enrollments" button → /dashboard/enrollments

### Features

- **State Management**: React Hooks (useState, useContext, useEffect)
- **API Integration**: 
  - Fetch API with error handling
  - API base URL configuration
  - Token-based authentication (headers)
  - Request/response interceptors
- **Form Validation**: Client-side validation before submission
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Loading States**: Spinners and loading messages
- **Error Handling**: User-friendly error messages
- **Navigation**: Next.js Link for page transitions
- **Protected Routes**: Middleware to check authentication

### API Integration Example

```javascript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  return response.json();
}
```

---

## 🧠 BUSINESS RULES

### Class Capacity
- Max 6 students per class
- Prevent overbooking at all costs
- Display available slots in real-time

### Enrollment Rules
- One student cannot enroll in same class twice
- Enrollment is unique: (student_id, class_id) pair
- Enrollments are permanent (no cancellation in MVP)

### Pricing
- Trial classes: ₹0
- Paid classes: Fixed price per curriculum
- Mixed cart supported (trial + paid)
- Cart total is sum of selected class prices

### Cart Rules
- Cart is session-specific per parent
- Cart items don't expire during session
- Adding same (student, class) pair again is prevented
- Cart can be cleared at any time

### Checkout Rules
- Total >= ₹0 (never negative)
- If total = ₹0 → Skip payment, create enrollments directly
- If total > ₹0 → Process mock payment first
- Checkout is atomic: (enroll all or enroll none)

### Payment Rules
- Mock Razorpay for MVP
- Payment must succeed before creating enrollments
- Transaction ID required for audit trail
- Simulate 2-3 sec processing time

---

## 🚨 EDGE CASES & HANDLING

### 1. Class Full During Checkout
- **Scenario**: Class had slot when added to cart, but fills up before checkout
- **Handling**: Validate availability again during checkout; show error with option to select alternative class
- **Code**: `checkAvailability(class_id)` before enrollment creation

### 2. Duplicate Student in Same Class
- **Scenario**: Parent tries to add same student to same class twice
- **Handling**: Prevent at cart level; check `(student_id, class_id)` uniqueness
- **Code**: `CartService::preventDuplicate()`

### 3. Stale Cart Data
- **Scenario**: Class price changes or is deleted after being added to cart
- **Handling**: Validate all items before checkout; show warning if price changed
- **Code**: Compare stored price with current price

### 4. Checkout Race Condition
- **Scenario**: Two parents checkout for last seat in same class simultaneously
- **Handling**: 
  - Lock class slots during checkout (in-memory flag)
  - Check available_slots one final time before enrollment
  - Whichever checkout finishes first wins the seat
  - Other checkout fails with "Class full" error
- **Code**: Atomic transaction simulation

### 5. Payment Success but Enrollment Fails
- **Scenario**: Payment succeeds but DB error occurs before creating enrollments
- **Handling**: Record transaction; retry enrollment creation; refund if needed
- **Code**: Separate payment and enrollment operations with idempotency

### 6. Invalid Student or Class
- **Scenario**: Parent tries to enroll deleted student or non-existent class
- **Handling**: Validate existence before adding to cart; validate again at checkout
- **Code**: Repository existence checks

### 7. Negative or Invalid Prices
- **Scenario**: Due to bug, curriculum has negative price
- **Handling**: Validate price >= 0 in services; sanitize curriculum data
- **Code**: `Curriculum::validatePrice()`

### 8. Session Timeout
- **Scenario**: Parent logged out, but cart still exists
- **Handling**: Clear cart on logout; validate authentication on every request
- **Code**: Middleware to validate token; cart service check parent_id

### 9. Concurrent Student Management
- **Scenario**: Parent deletes student while adding them to cart
- **Handling**: Validate student existence at checkout
- **Code**: Check student not soft-deleted before enrollment

### 10. Age Group Mismatch
- **Scenario**: Parent tries to enroll 15-year-old in 7-8 age group class
- **Handling**: Validate curriculum age_group matches student age at cart/checkout
- **Code**: `AgeGroupValidator::validate(student_age, curriculum_age_group)`

---

## User Stories

### Story 1: Parent Registration
- **As a** new parent
- **I want** to register with my email and create a password
- **So that** I can access the platform and enroll my child

### Story 2: Student Management
- **As a** parent
- **I want** to add and manage multiple students with their names and ages
- **So that** I can enroll them in appropriate age-group courses

### Story 3: Class Discovery
- **As a** parent
- **I want** to search classes by location, age group, course, and semester
- **So that** I can find suitable classes for my children

### Story 4: Class Selection
- **As a** parent
- **I want** to select multiple classes and assign multiple students to them
- **So that** I can create a custom enrollment plan

### Story 5: Cart Management
- **As a** parent
- **I want** to add/remove items from cart and review total price
- **So that** I can review my selections before paying

### Story 6: Checkout Process
- **As a** parent
- **I want** to complete checkout with mock payment for paid classes
- **So that** I can confirm my child's enrollment

### Story 7: Enrollment Confirmation
- **As a** parent
- **I want** to see a confirmation page with enrollment details
- **So that** I have proof of enrollment and can access enrollment info

### Story 8: Trial Classes
- **As a** budget-conscious parent
- **I want** to enroll my child in free trial classes
- **So that** I can test the platform before paying

### Story 9: Dashboard
- **As a** parent
- **I want** to view my dashboard with students and active enrollments
- **So that** I can manage all my enrollments in one place

---

## Dependencies

### Backend Dependencies
- Laravel 11+
- PHP 8.2+
- Composer

### Frontend Dependencies
- Node.js 18+
- npm/yarn
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS 3+

### External Services (Mocked)
- Razorpay (mocked for MVP)

---

## Constraints

- **No Real Database**: Use in-memory storage (arrays/Maps) for MVP
- **No Real Payment**: Mock Razorpay behavior
- **No Authentication Library**: Use simple session-based auth
- **No JWT Required**: Simple token in localStorage is sufficient
- **Locations Fixed**: Delhi, Bengaluru, Kolkata (add new via code change)
- **Age Range Fixed**: 7-17 years
- **Max Class Size**: 6 students (fixed)
- **MVP Scope**: No course customization, no instructor dashboard, no student app

---

## Timeline & Milestones

**Phase 1: Backend Setup (2-3 days)**
- [ ] Laravel project structure with modules
- [ ] In-memory data repositories
- [ ] Auth service and routes
- [ ] Student CRUD operations

**Phase 2: Course & Class Management (2 days)**
- [ ] Curriculum service with filtering
- [ ] Class search and availability logic
- [ ] Mock curriculum data seeding

**Phase 3: Cart & Checkout (3 days)**
- [ ] Cart service and endpoints
- [ ] Checkout logic with validation
- [ ] Mock Razorpay integration
- [ ] Enrollment creation

**Phase 4: Frontend Setup (2-3 days)**
- [ ] Next.js project setup with App Router
- [ ] Authentication pages (login, register)
- [ ] API integration utilities

**Phase 5: Frontend Pages (4-5 days)**
- [ ] Dashboard page
- [ ] Search and filter page
- [ ] Cart page
- [ ] Checkout page
- [ ] Thank you page

**Phase 6: Integration & Testing (2-3 days)**
- [ ] End-to-end flow testing
- [ ] Edge case handling
- [ ] Bug fixes and optimization
- [ ] Documentation

**Total MVP Timeline**: 15-20 days

---

## Notes

### Database Migration Strategy
- All current in-memory structures are DTO-compatible
- When migrating to PostgreSQL:
  - Create Laravel migrations for tables
  - Update repositories to use Eloquent
  - Minimal service logic changes required
  - API contracts remain unchanged

### Code Quality
- Follow PSR-12 (PHP) and ESLint (JavaScript) standards
- Use meaningful variable and function names
- Add inline comments for complex logic
- Modular and testable code structure

### Future Enhancements
- Real database (PostgreSQL)
- Real Razorpay integration
- Email notifications
- Instructor dashboard
- Student mobile app
- Video lesson integration
- Assignment submission
- Progress tracking
- Parent-teacher communication
- Referral program
- Advanced reporting

---

## 🔄 ORBUND INTEGRATION PLAN (Hidden Sync + Write-back)

> **Goal**: Users register on our website with no knowledge of Orbund. Orbund is a backend system-of-record that we sync with automatically.

### Flow 1 — 30-day Class Sync (Orbund → Our DB)

```
[Server Cron: every 30 days  →  php artisan schedule:run]
    └─ Artisan Command: orbund:sync-classes
         ├─ GET https://exceed.orbundsis.com/api/class/list
         ├─ Upsert into orbund_classes table (keyed on orbund_class_id)
         └─ Log: classes added / updated / removed
```

**What gets stored locally** (`orbund_classes` table):
- `orbund_class_id`, `program_id`, `semester_id`, `campus_type`
- `location`, `course`, `age_group`, `level_id`
- `schedule` (day/time), `available_slots`, `price`
- `synced_at` (timestamp of last successful pull)

Our class listing pages read from this local table — no live Orbund call on page load.

---

### Flow 2 — Website Registration → Hidden Orbund Write-back

```
[Parent registers on our website]
    └─ POST /api/register  (Laravel)
         ├─ 1. Validate & create local enrollment (status: pending)
         ├─ 2. Return 200 success to user immediately
         └─ 3. Dispatch background Job: RegisterStudentOnOrbund
                  ├─ POST https://exceed.orbundsis.com/api/enrollment/add
                  ├─ On success → update local enrollment
                  │     status: confirmed
                  │     orbund_enrollment_id: <returned id>
                  └─ On failure → retry 3× (exponential backoff)
                          then → flag enrollment for manual review
                          (status: orbund_failed, notify admin)
```

User never waits for Orbund. Errors are silent to the user but logged and flagged for admin.

---

### Backend Implementation Checklist (Laravel)

**Database**
- [ ] Migration: `orbund_classes` table (fields listed above)
- [ ] Model: `OrbundClass` with upsert helper

**Artisan Command**
- [ ] `app/Console/Commands/SyncOrbundClasses.php`
- [ ] Calls Orbund `/api/class/list` via Laravel HTTP Client
- [ ] Upserts rows, logs diff (added/updated/skipped/removed)

**Scheduler**
- [ ] `routes/console.php`: `Schedule::command('orbund:sync-classes')->monthly()`
- [ ] Server cron (one line): `* * * * * cd /path && php artisan schedule:run`

**Queue Job**
- [ ] `app/Jobs/RegisterStudentOnOrbund.php`
- [ ] Calls Orbund `/api/enrollment/add`
- [ ] Updates local enrollment on success; flags on final failure
- [ ] Uses `database` queue driver (upgrade to Redis in production)

**Queue Worker**
- [ ] Run worker: `php artisan queue:work --tries=3`
- [ ] Add to `Procfile` or Supervisor for production

**Registration Endpoint**
- [ ] `POST /api/register` dispatches `RegisterStudentOnOrbund::dispatch($enrollment)`

---

### Frontend Implementation Checklist (Next.js)

- [ ] Class listing page reads from our API (`/api/classes`) — sourced from `orbund_classes` table
- [ ] Registration form posts to our `/api/register` — no Orbund URLs exposed
- [ ] No Orbund credentials in any frontend JS (move all Orbund calls to backend)

---

### Orbund Credentials (backend only — never expose to frontend)

| Key | Value |
|-----|-------|
| Base URL | `https://exceed.orbundsis.com/api` |
| Client ID | `exceed` |
| Secret Key | stored in `.env` as `ORBUND_SECRET_KEY` |

Store in `backend-laravel/.env`:
```
ORBUND_BASE_URL=https://exceed.orbundsis.com/api
ORBUND_CLIENT_ID=exceed
ORBUND_SECRET_KEY=e0b6d2f0-f73a-4af2-bd3a-5b88872a3c5e
```

---

### Error & Edge Cases

| Scenario | Handling |
|----------|----------|
| Orbund API down during sync | Log error, keep last known data, retry next scheduled run |
| Orbund API down during write-back | Retry 3× with backoff; flag `orbund_failed`; admin dashboard shows flagged records |
| Class no longer exists in Orbund | Mark local record `inactive`; hide from listing |
| Duplicate enrollment write-back | Orbund returns existing ID; update local record; no duplicate created |
| Secret key rotation | Update `.env` only; no frontend deploy needed |

### Assumptions
- Single parent account per user (no team accounts)
- One parent email per registration
- All classes same duration
- No partial refunds in MVP
- All dates/times in IST (Indian Standard Time)
