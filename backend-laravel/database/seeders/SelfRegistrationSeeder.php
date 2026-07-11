<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Program;
use App\Models\Department;
use App\Models\Course;
use App\Models\CourseClass;
use Illuminate\Support\Carbon;

class SelfRegistrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Programs
        $coding = Program::create([
            'name' => 'Coding',
            'description' => 'Learn programming across multiple languages and frameworks',
            'department' => 'Technology',
        ]);

        $robotics = Program::create([
            'name' => 'Robotics',
            'description' => 'Explore robotics, automation, and engineering concepts',
            'department' => 'STEM',
        ]);

        // Create Departments (Locations)
        $delhi = Department::create([
            'name' => 'Delhi',
            'location' => 'Delhi, India',
            'description' => 'Delhi Learning Center',
        ]);

        $bengaluru = Department::create([
            'name' => 'Bengaluru',
            'location' => 'Bengaluru, India',
            'description' => 'Bengaluru Learning Center',
        ]);

        $kolkata = Department::create([
            'name' => 'Kolkata',
            'location' => 'Kolkata, India',
            'description' => 'Kolkata Learning Center',
        ]);

        // Create Courses for Coding - Delhi
        $pythonBasics = Course::create([
            'program_id' => $coding->id,
            'department_id' => $delhi->id,
            'name' => 'Python Basics',
            'description' => 'Learn Python fundamentals, variables, loops, and functions',
            'age_group' => '9-11',
            'level' => 'beginner',
            'price' => 5000,
            'is_trial' => false,
            'max_capacity' => 6,
            'semester' => 'APR-JUN',
        ]);

        $webDevelopment = Course::create([
            'program_id' => $coding->id,
            'department_id' => $delhi->id,
            'name' => 'Web Development',
            'description' => 'Learn HTML, CSS, and JavaScript for web development',
            'age_group' => '12+',
            'level' => 'intermediate',
            'price' => 7500,
            'is_trial' => false,
            'max_capacity' => 6,
            'semester' => 'JUL-SEP',
        ]);

        $codingTrial = Course::create([
            'program_id' => $coding->id,
            'department_id' => $delhi->id,
            'name' => 'Coding Trial Class',
            'description' => 'Free trial class to explore coding concepts',
            'age_group' => '7-8',
            'level' => 'beginner',
            'price' => 0,
            'is_trial' => true,
            'max_capacity' => 10,
            'semester' => 'APR-JUN',
        ]);

        // Create Courses for Robotics - Bengaluru
        $roboBasics = Course::create([
            'program_id' => $robotics->id,
            'department_id' => $bengaluru->id,
            'name' => 'Robotics Basics',
            'description' => 'Introduction to robotics and basic programming',
            'age_group' => '9-11',
            'level' => 'beginner',
            'price' => 8000,
            'is_trial' => false,
            'max_capacity' => 5,
            'semester' => 'APR-JUN',
        ]);

        $advancedRobo = Course::create([
            'program_id' => $robotics->id,
            'department_id' => $bengaluru->id,
            'name' => 'Advanced Robotics',
            'description' => 'Advanced robotics projects and autonomous systems',
            'age_group' => '12+',
            'level' => 'advanced',
            'price' => 12000,
            'is_trial' => false,
            'max_capacity' => 4,
            'semester' => 'OCT-DEC',
        ]);

        // Create Courses for Kolkata
        $aiFoundation = Course::create([
            'program_id' => $coding->id,
            'department_id' => $kolkata->id,
            'name' => 'AI Foundations',
            'description' => 'Introduction to Artificial Intelligence and Machine Learning',
            'age_group' => '12+',
            'level' => 'intermediate',
            'price' => 9000,
            'is_trial' => false,
            'max_capacity' => 6,
            'semester' => 'JAN-MAR',
        ]);

        // Create Classes for courses
        // Python Basics - Delhi
        for ($i = 1; $i <= 3; $i++) {
            CourseClass::create([
                'course_id' => $pythonBasics->id,
                'start_datetime' => Carbon::now()->addDays($i * 7)->setTime(14, 0),
                'end_datetime' => Carbon::now()->addDays($i * 7)->setTime(15, 0),
                'total_seats' => 6,
                'available_seats' => $i === 1 ? 2 : 6, // First class has 2 seats left
                'instructor' => 'Mr. Sharma',
                'location' => 'Delhi - Tech Hub Center',
                'status' => 'scheduled',
            ]);
        }

        // Web Development - Delhi
        for ($i = 1; $i <= 2; $i++) {
            CourseClass::create([
                'course_id' => $webDevelopment->id,
                'start_datetime' => Carbon::now()->addDays($i * 7)->setTime(16, 0),
                'end_datetime' => Carbon::now()->addDays($i * 7)->setTime(17, 0),
                'total_seats' => 6,
                'available_seats' => 6,
                'instructor' => 'Ms. Gupta',
                'location' => 'Delhi - Tech Hub Center',
                'status' => 'scheduled',
            ]);
        }

        // Coding Trial - Delhi
        CourseClass::create([
            'course_id' => $codingTrial->id,
            'start_datetime' => Carbon::now()->addDays(3)->setTime(10, 0),
            'end_datetime' => Carbon::now()->addDays(3)->setTime(11, 0),
            'total_seats' => 10,
            'available_seats' => 3,
            'instructor' => 'Mr. Patel',
            'location' => 'Delhi - Learning Center',
            'status' => 'scheduled',
        ]);

        // Robotics Basics - Bengaluru
        for ($i = 1; $i <= 2; $i++) {
            CourseClass::create([
                'course_id' => $roboBasics->id,
                'start_datetime' => Carbon::now()->addDays($i * 7)->setTime(15, 0),
                'end_datetime' => Carbon::now()->addDays($i * 7)->setTime(16, 30),
                'total_seats' => 5,
                'available_seats' => 5,
                'instructor' => 'Mr. Kulkarni',
                'location' => 'Bengaluru - Innovation Lab',
                'status' => 'scheduled',
            ]);
        }

        // Advanced Robotics - Bengaluru
        CourseClass::create([
            'course_id' => $advancedRobo->id,
            'start_datetime' => Carbon::now()->addMonths(2)->setTime(17, 0),
            'end_datetime' => Carbon::now()->addMonths(2)->setTime(18, 30),
            'total_seats' => 4,
            'available_seats' => 0, // Full class
            'instructor' => 'Dr. Rao',
            'location' => 'Bengaluru - Advanced Lab',
            'status' => 'scheduled',
        ]);

        // AI Foundations - Kolkata
        CourseClass::create([
            'course_id' => $aiFoundation->id,
            'start_datetime' => Carbon::now()->addMonths(3)->setTime(18, 0),
            'end_datetime' => Carbon::now()->addMonths(3)->setTime(19, 0),
            'total_seats' => 6,
            'available_seats' => 6,
            'instructor' => 'Dr. Banerjee',
            'location' => 'Kolkata - Tech Center',
            'status' => 'scheduled',
        ]);

        $this->command->info('Self Registration seed data created successfully!');
    }
}
