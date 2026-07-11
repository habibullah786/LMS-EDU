<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Student;
use App\Models\Enrollment;
use App\Models\CourseClass;
use App\Models\Waitlist;
use App\Http\Requests\IndividualRegistrationRequest;
use App\Http\Requests\BatchRegistrationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegistrationController extends Controller
{
    /**
     * Individual registration - create account and enroll in a single flow
     */
    public function registerIndividual(IndividualRegistrationRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            // Create user (parent)
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'role' => 'parent',
            ]);

            // Create student
            $student = Student::create([
                'user_id' => $user->id,
                'name' => $data['student_name'],
                'date_of_birth' => $data['date_of_birth'],
            ]);

            // Get the class
            $class = CourseClass::findOrFail($data['class_id']);

            // Check if class has available seats
            if (!$class->hasAvailableSeats()) {
                // Add to waitlist
                $waitlist = Waitlist::create([
                    'student_id' => $student->id,
                    'class_id' => $class->id,
                    'user_id' => $user->id,
                    'position' => Waitlist::where('class_id', $class->id)->count() + 1,
                    'status' => 'waiting',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Registration successful! You have been added to the waitlist.',
                    'type' => 'waitlist',
                    'data' => [
                        'user_id' => $user->id,
                        'student_id' => $student->id,
                        'waitlist_id' => $waitlist->id,
                        'position' => $waitlist->position,
                    ],
                ], 201);
            }

            // Get course details
            $course = $class->course;
            $price = $course->price;

            // Create enrollment
            $enrollment = Enrollment::create([
                'user_id' => $user->id,
                'parent_name' => $data['name'],
                'parent_email' => $data['email'],
                'parent_phone' => $data['phone'] ?? null,
                'total_amount' => $price,
                'status' => $price == 0 ? 'active' : 'pending_payment',
                'registration_type' => 'individual',
                'is_paid' => $price == 0,
                'booking_date' => now(),
            ]);

            // Add student to enrollment
            $enrollment->students()->create([
                'student_id' => $student->id,
                'class_id' => $class->id,
                'course_id' => $course->id,
                'location' => $class->location,
                'course' => $course->name,
                'price' => $price,
            ]);

            // Decrement available seats
            $class->decrementSeats();

            // If free course, automatically activate
            if ($price == 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Registration successful! You are enrolled in the class.',
                    'type' => 'enrolled',
                    'data' => [
                        'enrollment_id' => $enrollment->id,
                        'user_id' => $user->id,
                        'token' => Str::random(60),
                    ],
                ], 201);
            }

            // Otherwise, require payment
            return response()->json([
                'success' => true,
                'message' => 'Registration successful! Please proceed to payment.',
                'type' => 'payment_required',
                'data' => [
                    'enrollment_id' => $enrollment->id,
                    'user_id' => $user->id,
                    'amount' => $price,
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Batch registration - register multiple students without creating parent account
     */
    public function registerBatch(BatchRegistrationRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            $groupId = Str::uuid();
            $totalAmount = 0;
            $enrolledStudents = [];
            $waitlistedStudents = [];

            // Get the class
            $class = CourseClass::findOrFail($data['class_id']);
            $course = $class->course;

            // Check if user with this email exists
            $user = User::where('email', $data['parent_email'])->first();
            if (!$user) {
                $user = User::create([
                    'name' => $data['parent_name'],
                    'email' => $data['parent_email'],
                    'phone' => $data['parent_phone'] ?? null,
                    'role' => 'parent',
                    'password' => Hash::make(Str::random(16)), // Random password for batch registration
                ]);
            }

            // Process each student
            foreach ($data['students'] as $studentData) {
                $student = Student::firstOrCreate(
                    ['name' => $studentData['name'], 'user_id' => $user->id],
                    ['date_of_birth' => $studentData['date_of_birth']]
                );

                if ($class->hasAvailableSeats()) {
                    // Create enrollment
                    $enrollment = Enrollment::create([
                        'user_id' => $user->id,
                        'parent_name' => $data['parent_name'],
                        'parent_email' => $data['parent_email'],
                        'parent_phone' => $data['parent_phone'] ?? null,
                        'total_amount' => $course->price,
                        'status' => $course->price == 0 ? 'active' : 'pending_payment',
                        'registration_type' => 'batch',
                        'is_paid' => $course->price == 0,
                        'group_reference_id' => $groupId,
                        'booking_date' => now(),
                    ]);

                    $enrollment->students()->create([
                        'student_id' => $student->id,
                        'class_id' => $class->id,
                        'course_id' => $course->id,
                        'location' => $class->location,
                        'course' => $course->name,
                        'price' => $course->price,
                    ]);

                    $class->decrementSeats();
                    $totalAmount += $course->price;
                    $enrolledStudents[] = [
                        'student_id' => $student->id,
                        'enrollment_id' => $enrollment->id,
                        'status' => 'enrolled',
                    ];
                } else {
                    // Add to waitlist
                    $waitlist = Waitlist::create([
                        'student_id' => $student->id,
                        'class_id' => $class->id,
                        'user_id' => $user->id,
                        'position' => Waitlist::where('class_id', $class->id)->count() + 1,
                        'status' => 'waiting',
                    ]);

                    $waitlistedStudents[] = [
                        'student_id' => $student->id,
                        'waitlist_id' => $waitlist->id,
                        'status' => 'waitlisted',
                        'position' => $waitlist->position,
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Batch registration processed successfully!',
                'data' => [
                    'group_id' => $groupId,
                    'user_id' => $user->id,
                    'total_amount' => $totalAmount,
                    'enrolled_students' => $enrolledStudents,
                    'waitlisted_students' => $waitlistedStudents,
                    'payment_required' => $totalAmount > 0,
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Batch registration failed: ' . $e->getMessage(),
            ], 400);
        }
    }
}
