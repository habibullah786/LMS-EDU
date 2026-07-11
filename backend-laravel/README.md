# LMS-EDU Laravel Backend

Laravel backend API for the LMS-EDU platform.

## Setup

```bash
cd backend-laravel
composer install
php artisan migrate --seed
php artisan serve
```

Visit: `http://localhost:8000/api`

## API Endpoints

### Enrollments
- `GET /api/enrollments` - List all enrollments
- `GET /api/enrollments/stats` - Get enrollment statistics
- `GET /api/enrollments/filter-options` - Get available filter options
- `POST /api/enrollments` - Create new enrollment
- `GET /api/enrollments/{id}` - Get single enrollment
- `PUT /api/enrollments/{id}` - Update enrollment
- `DELETE /api/enrollments/{id}` - Delete enrollment

## Database

Uses SQLite for development. Migrations are located in `database/migrations/`.

## Seeders

Test data can be populated using:
```bash
php artisan db:seed --class=EnrollmentSeeder
```
