# Seamless Self-Registration API Documentation

## Overview
This document provides complete API specifications for the Seamless Self-Registration feature of the LMS-EDU platform. The feature supports individual registration, batch group registration, course discovery with filters, automatic enrollment with payment, and waitlist management.

---

## Base URL
```
http://localhost:8000/api
```

---

## 1. Individual Registration

### Endpoint
```
POST /register/individual
```

### Description
Allows a single parent to register themselves and one student, automatically enrolling them in a selected class. If the class is full, the student is added to the waitlist.

### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!",
  "phone": "+91-9876543210",
  "student_name": "Jane Doe",
  "date_of_birth": "2015-05-20",
  "class_id": 1
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Parent's full name (max 255) |
| email | string | Yes | Unique email address |
| password | string | Yes | Minimum 8 characters |
| password_confirmation | string | Yes | Must match password |
| phone | string | No | Contact number |
| student_name | string | Yes | Student's full name (max 255) |
| date_of_birth | date | Yes | Format: YYYY-MM-DD |
| class_id | integer | Yes | ID of class to enroll in |

### Response (Enrolled - Free Course)
```json
{
  "success": true,
  "message": "Registration successful! You are enrolled in the class.",
  "type": "enrolled",
  "data": {
    "enrollment_id": 1,
    "user_id": 5,
    "token": "random_token_string"
  }
}
```
**Status Code**: 201

### Response (Pending Payment - Paid Course)
```json
{
  "success": true,
  "message": "Registration successful! Please proceed to payment.",
  "type": "payment_required",
  "data": {
    "enrollment_id": 1,
    "user_id": 5,
    "amount": 5000
  }
}
```
**Status Code**: 201

### Response (Added to Waitlist - Class Full)
```json
{
  "success": true,
  "message": "Registration successful! You have been added to the waitlist.",
  "type": "waitlist",
  "data": {
    "user_id": 5,
    "student_id": 3,
    "waitlist_id": 7,
    "position": 2
  }
}
```
**Status Code**: 201

### Error Response
```json
{
  "success": false,
  "message": "Registration failed: [error details]"
}
```
**Status Code**: 400

---

## 2. Batch/Group Registration

### Endpoint
```
POST /register/batch
```

### Description
Allows bulk registration of multiple students under one parent. Used for group registrations or institutional registrations. Students are enrolled or waitlisted based on availability.

### Request Body
```json
{
  "group_name": "ABC School - Coding Batch 2024",
  "parent_email": "school.admin@example.com",
  "parent_name": "School Administrator",
  "parent_phone": "+91-9876543210",
  "students": [
    {
      "name": "Student One",
      "date_of_birth": "2012-03-15"
    },
    {
      "name": "Student Two",
      "date_of_birth": "2013-07-22"
    }
  ],
  "class_id": 1
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| group_name | string | Yes | Name for the batch (max 255) |
| parent_email | string | Yes | Email of group administrator |
| parent_name | string | Yes | Name of administrator (max 255) |
| parent_phone | string | No | Contact number |
| students | array | Yes | Array of student objects (min 1) |
| students[].name | string | Yes | Student name (max 255) |
| students[].date_of_birth | date | Yes | Format: YYYY-MM-DD |
| class_id | integer | Yes | ID of class for all students |

### Response (Partial Enrollment)
```json
{
  "success": true,
  "message": "Batch registration processed successfully!",
  "data": {
    "group_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": 6,
    "total_amount": 15000,
    "enrolled_students": [
      {
        "student_id": 4,
        "enrollment_id": 2,
        "status": "enrolled"
      },
      {
        "student_id": 5,
        "enrollment_id": 3,
        "status": "enrolled"
      }
    ],
    "waitlisted_students": [
      {
        "student_id": 6,
        "waitlist_id": 8,
        "status": "waitlisted",
        "position": 1
      }
    ],
    "payment_required": true
  }
}
```
**Status Code**: 201

### Error Response
```json
{
  "success": false,
  "message": "Batch registration failed: [error details]"
}
```
**Status Code**: 400

---

## 3. Course Discovery & Filtering

### 3.1 List All Courses

#### Endpoint
```
GET /courses
```

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| program_id | integer | Filter by program ID |
| department_id | integer | Filter by department/location ID |
| age_group | string | Filter by age group (7-8, 9-11, 12+) |
| level | string | Filter by level (beginner, intermediate, advanced) |
| is_trial | boolean | Filter by trial (true) or paid (false) courses |
| search | string | Search by course name or description |
| per_page | integer | Results per page (default: 15, max: 100) |

#### Example Request
```
GET /courses?program_id=1&department_id=2&age_group=9-11&is_trial=false
```

#### Response
```json
{
  "success": true,
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "program_id": 1,
        "department_id": 2,
        "name": "Python Basics",
        "description": "Learn Python programming fundamentals",
        "age_group": "9-11",
        "level": "beginner",
        "price": 5000,
        "is_trial": false,
        "max_capacity": 6,
        "semester": "APR-JUN",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 25,
    "per_page": 15,
    "last_page": 2
  }
}
```

---

### 3.2 Get Course Details

#### Endpoint
```
GET /courses/{courseId}
```

#### Example Request
```
GET /courses/1
```

#### Response
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "program_id": 1,
      "department_id": 2,
      "name": "Python Basics",
      "description": "Learn Python programming fundamentals",
      "age_group": "9-11",
      "level": "beginner",
      "price": 5000,
      "is_trial": false,
      "max_capacity": 6,
      "semester": "APR-JUN",
      "program": {
        "id": 1,
        "name": "Coding"
      },
      "department": {
        "id": 2,
        "name": "Delhi",
        "location": "Delhi"
      }
    },
    "classes": [
      {
        "id": 1,
        "start_datetime": "2024-04-15T10:00:00Z",
        "end_datetime": "2024-04-15T11:00:00Z",
        "instructor": "Mr. Smith",
        "location": "Delhi - Center A",
        "total_seats": 6,
        "available_seats": 2,
        "has_available_seats": true,
        "status": "scheduled"
      },
      {
        "id": 2,
        "start_datetime": "2024-04-20T15:00:00Z",
        "end_datetime": "2024-04-20T16:00:00Z",
        "instructor": "Ms. Johnson",
        "location": "Delhi - Center B",
        "total_seats": 6,
        "available_seats": 0,
        "has_available_seats": false,
        "status": "scheduled"
      }
    ]
  }
}
```

---

### 3.3 List Programs

#### Endpoint
```
GET /courses/programs
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Coding",
      "description": "Programming and coding courses",
      "department": "STEM"
    },
    {
      "id": 2,
      "name": "Robotics",
      "description": "Robotics and engineering courses",
      "department": "STEM"
    }
  ]
}
```

---

### 3.4 List Departments/Locations

#### Endpoint
```
GET /courses/departments
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Delhi",
      "location": "Delhi, India"
    },
    {
      "id": 2,
      "name": "Bengaluru",
      "location": "Bengaluru, India"
    },
    {
      "id": 3,
      "name": "Kolkata",
      "location": "Kolkata, India"
    }
  ]
}
```

---

### 3.5 Get Filter Options

#### Endpoint
```
GET /courses/filter-options
```

#### Description
Returns all available filter options for the UI dropdowns.

#### Response
```json
{
  "success": true,
  "data": {
    "programs": [
      {
        "id": 1,
        "name": "Coding"
      },
      {
        "id": 2,
        "name": "Robotics"
      }
    ],
    "departments": [
      {
        "id": 1,
        "name": "Delhi"
      },
      {
        "id": 2,
        "name": "Bengaluru"
      },
      {
        "id": 3,
        "name": "Kolkata"
      }
    ],
    "age_groups": ["7-8", "9-11", "12+"],
    "levels": ["beginner", "intermediate", "advanced"],
    "semesters": ["APR-JUN", "JUL-SEP", "OCT-DEC", "JAN-MAR"]
  }
}
```

---

## 4. Payment Processing

### 4.1 Create Payment

#### Endpoint
```
POST /payments/create/{enrollmentId}
```

#### Example Request
```
POST /payments/create/1
```

#### Response
```json
{
  "success": true,
  "message": "Payment initiated.",
  "data": {
    "payment_id": 1,
    "enrollment_id": 1,
    "amount": 5000,
    "currency": "INR",
    "razorpay_order_id": "order_1A2B3C4D"
  }
}
```

---

### 4.2 Process Payment

#### Endpoint
```
POST /payments/process
```

#### Description
Verifies payment with Razorpay/payment gateway and marks enrollment as active.

#### Request Body
```json
{
  "enrollment_id": 1,
  "payment_method": "razorpay",
  "razorpay_payment_id": "pay_1A2B3C4D",
  "razorpay_order_id": "order_1A2B3C4D",
  "razorpay_signature": "signature_hash"
}
```

#### Response (Success)
```json
{
  "success": true,
  "message": "Payment successful! You are now enrolled.",
  "data": {
    "enrollment_id": 1,
    "payment_id": 1,
    "status": "completed"
  }
}
```
**Status Code**: 200

#### Response (Failure)
```json
{
  "success": false,
  "message": "Payment processing failed: [error details]"
}
```
**Status Code**: 400

---

### 4.3 Get Payment Details

#### Endpoint
```
GET /payments/{paymentId}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "enrollment_id": 1,
    "user_id": 5,
    "amount": 5000,
    "currency": "INR",
    "payment_method": "razorpay",
    "transaction_id": "txn_1A2B3C4D",
    "status": "completed",
    "processed_at": "2024-01-15T11:30:00Z",
    "metadata": {
      "razorpay_payment_id": "pay_1A2B3C4D"
    }
  }
}
```

---

### 4.4 List User Payments

#### Endpoint
```
GET /payments/user/list
```

#### Headers
```
Authorization: Bearer {token}
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "enrollment_id": 1,
      "amount": 5000,
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 5. Waitlist Management

### 5.1 Get Class Waitlist

#### Endpoint
```
GET /waitlist/class/{classId}
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": 3,
      "class_id": 2,
      "user_id": 5,
      "position": 1,
      "status": "waiting",
      "approved_at": null,
      "created_at": "2024-01-15T10:30:00Z",
      "student": {
        "id": 3,
        "name": "Jane Doe"
      },
      "user": {
        "id": 5,
        "name": "John Doe",
        "email": "john.doe@example.com"
      }
    }
  ]
}
```

---

### 5.2 Get User's Waitlist

#### Endpoint
```
GET /waitlist/user
```

#### Headers
```
Authorization: Bearer {token}
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": 3,
      "class_id": 2,
      "position": 1,
      "status": "waiting",
      "student": {
        "id": 3,
        "name": "Jane Doe"
      },
      "class": {
        "id": 2,
        "course": {
          "id": 1,
          "name": "Python Basics"
        }
      }
    }
  ]
}
```

---

### 5.3 Approve Waitlist Entry (Admin Only)

#### Endpoint
```
POST /waitlist/{waitlistId}/approve
```

#### Headers
```
Authorization: Bearer {admin_token}
```

#### Request Body
```json
{
  "action": "approve"
}
```

#### Response
```json
{
  "success": true,
  "message": "Waitlist entry approved and student enrolled.",
  "data": {
    "waitlist_id": 1,
    "enrollment_id": 5
  }
}
```

---

### 5.4 Reject Waitlist Entry (Admin Only)

#### Endpoint
```
POST /waitlist/{waitlistId}/approve
```

#### Headers
```
Authorization: Bearer {admin_token}
```

#### Request Body
```json
{
  "action": "reject",
  "reason": "Class capacity reached from main enrollment"
}
```

#### Response
```json
{
  "success": true,
  "message": "Waitlist entry rejected.",
  "data": {
    "waitlist_id": 1
  }
}
```

---

### 5.5 Remove from Waitlist

#### Endpoint
```
DELETE /waitlist/{waitlistId}
```

#### Headers
```
Authorization: Bearer {token}
```

#### Response
```json
{
  "success": true,
  "message": "Removed from waitlist."
}
```

---

### 5.6 Waitlist Statistics (Admin Only)

#### Endpoint
```
GET /waitlist/stats
```

#### Headers
```
Authorization: Bearer {admin_token}
```

#### Response
```json
{
  "success": true,
  "data": {
    "total_waiting": 15,
    "total_approved": 8,
    "total_enrolled_from_waitlist": 12,
    "total_rejected": 3
  }
}
```

---

## 6. Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

### Validation Error Response
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

---

## 7. Data Models

### User Model
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+91-9876543210",
  "role": "parent",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Student Model
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Jane Doe",
  "date_of_birth": "2015-05-20",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Course Model
```json
{
  "id": 1,
  "program_id": 1,
  "department_id": 1,
  "name": "Python Basics",
  "description": "Learn Python fundamentals",
  "age_group": "9-11",
  "level": "beginner",
  "price": 5000,
  "is_trial": false,
  "max_capacity": 6,
  "semester": "APR-JUN"
}
```

### Class Model
```json
{
  "id": 1,
  "course_id": 1,
  "start_datetime": "2024-04-15T10:00:00Z",
  "end_datetime": "2024-04-15T11:00:00Z",
  "total_seats": 6,
  "available_seats": 2,
  "instructor": "Mr. Smith",
  "location": "Delhi - Center A",
  "status": "scheduled"
}
```

### Enrollment Model
```json
{
  "id": 1,
  "user_id": 1,
  "parent_name": "John Doe",
  "parent_email": "john.doe@example.com",
  "total_amount": 5000,
  "status": "active",
  "registration_type": "individual",
  "is_paid": true,
  "group_reference_id": null,
  "booking_date": "2024-01-15T10:30:00Z"
}
```

---

## 8. Implementation Flow

### Individual Registration Flow
```
1. POST /register/individual
   ↓
2. Validate input and create User + Student
   ↓
3. Check class availability
   ├─→ Has seats: Create Enrollment, decrement seats
   │   └─→ If free: Status = "active"
   │   └─→ If paid: Status = "pending_payment" → Redirect to payment
   └─→ No seats: Create Waitlist entry
   ↓
4. Return response with status and data
```

### Batch Registration Flow
```
1. POST /register/batch
   ↓
2. Validate input and find/create User
   ↓
3. For each student:
   ├─→ Create Student record
   └─→ Check class availability
       ├─→ Has seats: Create Enrollment, decrement seats
       └─→ No seats: Create Waitlist entry
   ↓
4. Return response with enrolled and waitlisted students
```

### Payment Flow
```
1. POST /payments/create/{enrollmentId}
   ↓
2. Create Payment record (status = pending)
   ↓
3. Return payment details for frontend to process with Razorpay
   ↓
4. Frontend processes payment and gets signature
   ↓
5. POST /payments/process
   ↓
6. Verify signature and update Enrollment (status = "active", is_paid = true)
   ↓
7. Return success response
```

### Waitlist Approval Flow
```
1. POST /waitlist/{waitlistId}/approve (with action="approve")
   ↓
2. Verify admin authorization (via middleware)
   ↓
3. Check if class has available seats
   ├─→ Yes: Create Enrollment, decrement seats, update Waitlist status
   └─→ No: Return error message
   ↓
4. Reorder remaining waitlist positions
   ↓
5. Return success response with enrollment details
```

---

## 9. Best Practices

1. **Always validate input** on the backend, even if validated on the frontend
2. **Check class availability** before creating enrollments
3. **Use transactions** for batch operations to ensure consistency
4. **Verify payment signatures** with Razorpay for security
5. **Implement proper error handling** and return meaningful error messages
6. **Use authentication tokens** for sensitive endpoints
7. **Log all payment transactions** for audit purposes
8. **Implement rate limiting** to prevent abuse
9. **Cache filter options** for better performance
10. **Test all edge cases** like concurrent registrations

---

## 10. Testing Examples

### cURL: Individual Registration
```bash
curl -X POST http://localhost:8000/api/register/individual \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "password_confirmation": "SecurePassword123!",
    "phone": "+91-9876543210",
    "student_name": "Jane Doe",
    "date_of_birth": "2015-05-20",
    "class_id": 1
  }'
```

### cURL: List Courses with Filters
```bash
curl -X GET "http://localhost:8000/api/courses?program_id=1&age_group=9-11&is_trial=false" \
  -H "Content-Type: application/json"
```

### cURL: Process Payment
```bash
curl -X POST http://localhost:8000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "enrollment_id": 1,
    "payment_method": "razorpay",
    "razorpay_payment_id": "pay_1A2B3C4D",
    "razorpay_order_id": "order_1A2B3C4D",
    "razorpay_signature": "signature_hash"
  }'
```

---

## 11. Future Enhancements

- [ ] Razorpay integration with live API
- [ ] Email notifications for enrollment and waitlist updates
- [ ] SMS notifications for immediate alerts
- [ ] Discount codes and promotional offers
- [ ] Certificate generation upon course completion
- [ ] Parent dashboard with enrollment management
- [ ] Student progress tracking
- [ ] Rescheduling and cancellation with refunds
- [ ] Multi-class enrollment bundling
- [ ] Corporate group discounts

---

*Last Updated: May 4, 2026*
*Version: 1.0*
