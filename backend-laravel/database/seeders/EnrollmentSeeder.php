<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Student;
use App\Models\Enrollment;
use App\Models\EnrollmentStudent;
use Illuminate\Support\Facades\Hash;

class EnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        // Create parent user
        $parentUser = User::firstOrCreate(
            ['email' => 'parent@example.com'],
            [
                'name' => 'Demo Parent',
                'password' => Hash::make('Password123!'),
                'role' => 'parent',
                'phone' => '+91 98765 43210',
            ]
        );

        // Create admin user
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@lmsedu.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('Password123!'),
                'role' => 'admin',
                'phone' => '+91 98765 43211',
            ]
        );

        // Create sample students
        $student1 = Student::firstOrCreate(
            ['id' => 1],
            [
                'user_id' => $parentUser->id,
                'name' => 'Aarav Kumar',
                'date_of_birth' => '2019-03-15',
            ]
        );

        $student2 = Student::firstOrCreate(
            ['id' => 2],
            [
                'user_id' => $parentUser->id,
                'name' => 'Ananya Singh',
                'date_of_birth' => '2015-07-22',
            ]
        );

        $student3 = Student::firstOrCreate(
            ['id' => 3],
            [
                'user_id' => $parentUser->id,
                'name' => 'Rohan Patel',
                'date_of_birth' => '2013-11-08',
            ]
        );

        // Create enrollment 1
        $enrollment1 = Enrollment::create([
            'user_id' => $parentUser->id,
            'parent_name' => 'Demo Parent',
            'parent_email' => 'parent@example.com',
            'parent_phone' => '+91 98765 43210',
            'total_amount' => 0, // Trial class
            'status' => 'confirmed',
            'booking_date' => now()->subDays(5),
        ]);

        EnrollmentStudent::create([
            'enrollment_id' => $enrollment1->id,
            'student_id' => $student1->id,
            'class_id' => 'class-1',
            'class_name' => 'Coding Level 1',
            'course' => 'Coding',
            'location' => 'Delhi',
            'instructor' => 'Ms. Nisha',
            'price' => 0,
            'type' => 'Trial',
        ]);

        // Create enrollment 2
        $enrollment2 = Enrollment::create([
            'user_id' => $parentUser->id,
            'parent_name' => 'Demo Parent',
            'parent_email' => 'parent@example.com',
            'parent_phone' => '+91 98765 43210',
            'total_amount' => 5999,
            'status' => 'pending',
            'booking_date' => now()->subDays(2),
        ]);

        EnrollmentStudent::create([
            'enrollment_id' => $enrollment2->id,
            'student_id' => $student2->id,
            'class_id' => 'class-2',
            'class_name' => 'Coding Level 2',
            'course' => 'Coding',
            'location' => 'Bengaluru',
            'instructor' => 'Mr. Rohit',
            'price' => 5999,
            'type' => 'Paid',
        ]);

        // Create enrollment 3
        $enrollment3 = Enrollment::create([
            'user_id' => $parentUser->id,
            'parent_name' => 'Demo Parent',
            'parent_email' => 'parent@example.com',
            'parent_phone' => '+91 98765 43210',
            'total_amount' => 7999,
            'status' => 'confirmed',
            'booking_date' => now()->subDays(10),
        ]);

        EnrollmentStudent::create([
            'enrollment_id' => $enrollment3->id,
            'student_id' => $student3->id,
            'class_id' => 'class-4',
            'class_name' => 'Robotics Advanced',
            'course' => 'Robotics',
            'location' => 'Delhi',
            'instructor' => 'Mr. Sanjay',
            'price' => 7999,
            'type' => 'Paid',
        ]);

        // Create enrollment 4 (multiple students)
        $enrollment4 = Enrollment::create([
            'user_id' => $parentUser->id,
            'parent_name' => 'Demo Parent',
            'parent_email' => 'parent@example.com',
            'parent_phone' => '+91 98765 43210',
            'total_amount' => 0,
            'status' => 'confirmed',
            'booking_date' => now()->subDays(15),
        ]);

        EnrollmentStudent::create([
            'enrollment_id' => $enrollment4->id,
            'student_id' => $student1->id,
            'class_id' => 'class-3',
            'class_name' => 'Robotics Basics',
            'course' => 'Robotics',
            'location' => 'Kolkata',
            'instructor' => 'Ms. Priya',
            'price' => 0,
            'type' => 'Trial',
        ]);

        EnrollmentStudent::create([
            'enrollment_id' => $enrollment4->id,
            'student_id' => $student2->id,
            'class_id' => 'class-5',
            'class_name' => 'Coding Fundamentals',
            'course' => 'Coding',
            'location' => 'Bengaluru',
            'instructor' => 'Ms. Aarti',
            'price' => 6999,
            'type' => 'Paid',
        ]);

        $this->command->info('Enrollment seeder completed successfully!');
    }
}
