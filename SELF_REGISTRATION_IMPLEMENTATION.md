# Seamless Self-Registration - Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing and deploying the Seamless Self-Registration feature for LMS-EDU.

---

## Table of Contents
1. [Database Setup](#database-setup)
2. [Configuration](#configuration)
3. [Testing](#testing)
4. [Frontend Integration](#frontend-integration)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Database Setup

### Step 1: Create Migrations
All migration files have been created in `database/migrations/`. The files are:
- `2024_01_05_000000_create_programs_table.php`
- `2024_01_06_000000_create_departments_table.php`
- `2024_01_07_000000_create_courses_table.php`
- `2024_01_08_000000_create_classes_table.php`
- `2024_01_09_000000_create_waitlists_table.php`
- `2024_01_10_000000_create_payments_table.php`
- `2024_01_11_000000_update_enrollments_table_for_self_registration.php`

### Step 2: Run Migrations
```bash
cd /Users/habib/Desktop/LMS-EDU/backend-laravel

# Run all migrations
php artisan migrate

# Or run specific migration
php artisan migrate --path=database/migrations/2024_01_05_000000_create_programs_table.php
```

### Step 3: Seed Initial Data
```bash
# Run all seeders
php artisan db:seed

# Or run specific seeder
php artisan db:seed --class=SelfRegistrationSeeder
```

### Step 4: Verify Database
```bash
# Check all tables
php artisan migrate:status

# Access Laravel Tinker for queries
php artisan tinker

# Example: Check programs
> App\Models\Program::all()
> App\Models\Department::all()
> App\Models\Course::with('program', 'department')->get()
```

---

## Configuration

### Step 1: Environment Variables
Add these to `.env` file in the backend directory:

```env
# Payment Gateway Configuration
RAZORPAY_KEY=your_razorpay_key_here
RAZORPAY_SECRET=your_razorpay_secret_here

# Email Configuration (for notifications)
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=465
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password
MAIL_FROM_ADDRESS=notify@lmsedu.com

# Application URLs
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### Step 2: Update Model Fillables
All models have been updated with appropriate fillable properties:
- `User.php` - includes role and phone
- `Enrollment.php` - includes new registration fields
- `Course.php` - complete course attributes
- `CourseClass.php` - class attributes
- `Waitlist.php` - waitlist tracking
- `Payment.php` - payment details

### Step 3: Register Providers (if needed)
The models are auto-discovered by Laravel. No additional registration needed.

---

## Testing

### Step 1: Test Individual Registration
```bash
# Terminal 1: Start the Laravel server
cd /Users/habib/Desktop/LMS-EDU/backend-laravel
php artisan serve

# Terminal 2: Run test
curl -X POST http://localhost:8000/api/register/individual \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "password_confirmation": "TestPassword123!",
    "phone": "+91-9999999999",
    "student_name": "Test Student",
    "date_of_birth": "2010-05-15",
    "class_id": 1
  }'
```

### Step 2: Test Batch Registration
```bash
curl -X POST http://localhost:8000/api/register/batch \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "School Batch A",
    "parent_email": "school@example.com",
    "parent_name": "Principal",
    "parent_phone": "+91-8888888888",
    "students": [
      {"name": "Student A", "date_of_birth": "2012-03-15"},
      {"name": "Student B", "date_of_birth": "2013-07-22"}
    ],
    "class_id": 1
  }'
```

### Step 3: Test Course Listing
```bash
# List all courses
curl http://localhost:8000/api/courses

# List with filters
curl "http://localhost:8000/api/courses?program_id=1&age_group=9-11&is_trial=false"

# Get filter options
curl http://localhost:8000/api/courses/filter-options

# Get course details
curl http://localhost:8000/api/courses/1
```

### Step 4: Test Waitlist
```bash
# Get class waitlist
curl http://localhost:8000/api/waitlist/class/2

# Get user waitlist (requires token)
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/waitlist/user
```

### Step 5: Run Unit Tests
```bash
# Create test file
php artisan make:test RegistrationTest

# Run tests
php artisan test

# Run specific test class
php artisan test tests/Feature/RegistrationTest.php
```

---

## Frontend Integration

### Step 1: Create Registration Components

Create new components in `frontend/app/components/`:

#### SelfRegistrationForm.tsx
```typescript
'use client';

import { useState } from 'react';
import axios from 'axios';

export default function SelfRegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    student_name: '',
    date_of_birth: '',
    class_id: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/register/individual`,
        formData
      );
      
      if (response.data.type === 'enrolled') {
        // Redirect to enrolled confirmation
        window.location.href = '/thank-you?type=enrolled';
      } else if (response.data.type === 'payment_required') {
        // Redirect to payment
        window.location.href = `/checkout?enrollment_id=${response.data.data.enrollment_id}`;
      } else if (response.data.type === 'waitlist') {
        // Show waitlist confirmation
        window.location.href = `/waitlist-confirmation?position=${response.data.data.position}`;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

#### CourseFilter.tsx
```typescript
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CourseFilter() {
  const [filters, setFilters] = useState({
    program_id: null,
    department_id: null,
    age_group: null,
    level: null,
  });
  
  const [filterOptions, setFilterOptions] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/courses/filter-options`
    );
    setFilterOptions(response.data.data);
  };

  const fetchCourses = async () => {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/courses`,
      { params: filters }
    );
    setCourses(response.data.data.data);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchCourses();
  };

  return (
    <div>
      {/* Filter dropdowns */}
      {/* Courses list */}
    </div>
  );
}
```

### Step 2: Update Pages

#### Update `app/page.tsx` - Add Self-Registration CTA
```typescript
export default function Home() {
  return (
    <main>
      {/* Existing content */}
      
      <section className="py-20 bg-blue-50">
        <div className="section-container text-center">
          <h2 className="text-4xl font-bold mb-4">Start Learning Today</h2>
          <p className="text-xl text-gray-600 mb-8">
            Register yourself or your group now and explore our courses
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register/individual" className="btn-primary">
              Individual Registration
            </Link>
            <Link href="/register/batch" className="btn-secondary">
              Group Registration
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

#### Create `app/register/individual/page.tsx`
```typescript
'use client';

import SelfRegistrationForm from '@/app/components/SelfRegistrationForm';

export default function IndividualRegistration() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Individual Registration</h1>
        <SelfRegistrationForm />
      </div>
    </div>
  );
}
```

#### Create `app/courses/page.tsx`
```typescript
'use client';

import CourseFilter from '@/app/components/CourseFilter';

export default function CourseListing() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="section-container">
        <h1 className="text-4xl font-bold mb-8">Browse Courses</h1>
        <CourseFilter />
      </div>
    </div>
  );
}
```

### Step 3: Update Context/API Service
```typescript
// frontend/app/services/api.ts

export const courseService = {
  // Get filter options
  getFilterOptions: () =>
    api.get('/courses/filter-options'),

  // List courses
  listCourses: (filters?: any) =>
    api.get('/courses', { params: filters }),

  // Get course details
  getCourse: (courseId: number) =>
    api.get(`/courses/${courseId}`),

  // Get available classes
  getAvailableClasses: (courseId: number) =>
    api.get(`/courses/${courseId}/classes`),
};

export const registrationService = {
  // Individual registration
  registerIndividual: (data: any) =>
    api.post('/register/individual', data),

  // Batch registration
  registerBatch: (data: any) =>
    api.post('/register/batch', data),
};

export const waitlistService = {
  // Get user waitlist
  getUserWaitlist: () =>
    api.get('/waitlist/user'),

  // Remove from waitlist
  removeFromWaitlist: (waitlistId: number) =>
    api.delete(`/waitlist/${waitlistId}`),
};

export const paymentService = {
  // Create payment
  createPayment: (enrollmentId: number) =>
    api.post(`/payments/create/${enrollmentId}`),

  // Process payment
  processPayment: (data: any) =>
    api.post('/payments/process', data),
};
```

---

## Production Deployment

### Step 1: Database Backup
```bash
# Backup existing database
mysqldump -u root -p lmsedu_db > backup_lmsedu_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup if needed
mysql -u root -p lmsedu_db < backup_file.sql
```

### Step 2: Run Migrations in Production
```bash
# SSH into production server
ssh user@production-server

# Navigate to project
cd /var/www/lmsedu/backend-laravel

# Backup database
php artisan backup:run

# Run migrations
php artisan migrate --env=production --force

# Seed data
php artisan db:seed --class=SelfRegistrationSeeder --env=production
```

### Step 3: Cache Configuration
```bash
# Clear all caches
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize for production
php artisan optimize
composer dump-autoload --optimize
```

### Step 4: Set Permissions
```bash
# Set proper permissions
sudo chown -R www-data:www-data /var/www/lmsedu/backend-laravel
sudo chmod -R 755 /var/www/lms-edu/backend-laravel/storage
sudo chmod -R 755 /var/www/lmsedu/backend-laravel/bootstrap/cache
```

---

## Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution:**
```bash
# Rollback migrations
php artisan migrate:rollback

# Or reset database
php artisan migrate:reset

# Then re-run
php artisan migrate
```

### Issue: "Class not found" error
**Solution:**
```bash
# Clear autoloader
composer dump-autoload

# Clear Laravel cache
php artisan cache:clear
php artisan config:clear
```

### Issue: Foreign key constraint error
**Solution:**
1. Ensure parent tables exist before child tables
2. Check column types match (both should be unsigned bigint)
3. Verify foreign key references correct table/column
4. In MySQL, run: `SET FOREIGN_KEY_CHECKS=0;` before operations

### Issue: "Class 'App\Models\Course' not found"
**Solution:**
1. Verify model files exist in `app/Models/`
2. Check namespace is correct: `namespace App\Models;`
3. Run: `composer dump-autoload`

### Issue: Payment verification fails
**Solution:**
1. Verify Razorpay credentials in `.env`
2. Check payment signature calculation
3. Ensure timestamp is within tolerance
4. Verify callback POST payload format

### Issue: Waitlist position not updating
**Solution:**
1. Check `reorderWaitlist()` function is called after removal
2. Verify SQL query for position calculation
3. Run: `php artisan tinker` to manually reorder

---

## Quick Commands Reference

```bash
# Development
php artisan serve                                    # Start local server
php artisan tinker                                  # Interactive shell
php artisan make:migration create_new_table         # Create migration
php artisan make:model ModelName                    # Create model
php artisan make:controller ControllerName          # Create controller

# Database
php artisan migrate                                 # Run migrations
php artisan migrate:rollback                        # Rollback last batch
php artisan migrate:reset                           # Reset all migrations
php artisan db:seed                                 # Run seeders
php artisan db:seed --class=SelfRegistrationSeeder  # Run specific seeder

# Cache & Optimization
php artisan cache:clear                             # Clear cache
php artisan config:cache                            # Cache config
php artisan route:cache                             # Cache routes
php artisan view:cache                              # Cache views
php artisan optimize                                # Optimize app

# Testing
php artisan test                                    # Run tests
php artisan test --filter=RegistrationTest          # Run specific test
php artisan make:test RegistrationTest              # Create test

# Debugging
php artisan tinker                                  # Start Tinker
php artisan tail                                    # Tail log files
```

---

## Support & Documentation

- [Laravel Documentation](https://laravel.com/docs)
- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Project README](./README.md)

---

*Last Updated: May 4, 2026*
*Version: 1.0*
