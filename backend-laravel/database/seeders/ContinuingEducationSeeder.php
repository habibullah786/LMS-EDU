<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Coupon;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\SchoolClassWaitlist;
use App\Models\TrialEnrollmentStudent;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ContinuingEducationSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Paid (continuing education) classes ───────────────────────────
        $classes = [
            [
                'curriculum'      => 'Robotics Level 2 — Saturdays (Thornhill)',
                'locations'       => ['Thornhill'],
                'age_groups'      => ['9–11 Years Old'],
                'course'          => 'Robotics',
                'type'            => 'Paid',
                'semester'        => '4000979',
                'price'           => 349.00,
                'date'            => '2026-09-12',
                'time'            => '10:00 AM',
                'available_slots' => 4,
                'instructor'      => 'Mr. Sanjay',
                'max_students'    => 6,
                'hide_when_full'  => false,
                'department'      => 'Thornhill Campus',
                'modules'         => [
                    ['title' => 'Module 1: Sensors & Actuators', 'description' => 'Intro to motors, servos, and sensor input.'],
                    ['title' => 'Module 2: Programming Logic', 'description' => 'Loops, conditionals, and event-driven control.'],
                    ['title' => 'Module 3: Final Build', 'description' => 'Students design and present a working robot.'],
                ],
            ],
            [
                'curriculum'      => 'Coding Fundamentals — Sundays (Richmond Hill)',
                'locations'       => ['Richmond Hill'],
                'age_groups'      => ['9–11 Years Old'],
                'course'          => 'Coding',
                'type'            => 'Paid',
                'semester'        => '4000979',
                'price'           => 299.00,
                'date'            => '2026-09-13',
                'time'            => '1:00 PM',
                'available_slots' => 6,
                'instructor'      => 'Ms. Aarti',
                'max_students'    => 6,
                'hide_when_full'  => false,
            ],
            [
                'curriculum'      => 'AI & Face Detection with Raspberry Pi (Yonge & Lawrence)',
                'locations'       => ['Yonge & Lawrence'],
                'age_groups'      => ['12–15 Years Old'],
                'course'          => 'Coding',
                'type'            => 'Paid',
                'semester'        => '4000979',
                'price'           => 399.00,
                'date'            => '2026-09-14',
                'time'            => '3:00 PM',
                'available_slots' => 0,
                'instructor'      => 'Mr. Rohit',
                'max_students'    => 6,
                'hide_when_full'  => false,
            ],
            [
                'curriculum'      => 'Robotics Advanced — 3D Printing & Electronics (Thornhill)',
                'locations'       => ['Thornhill'],
                'age_groups'      => ['12–15 Years Old'],
                'course'          => 'Robotics',
                'type'            => 'Paid',
                'semester'        => '4000979',
                'price'           => 379.00,
                'date'            => '2026-09-19',
                'time'            => '10:00 AM',
                'available_slots' => 6,
                'instructor'      => 'Ms. Priya',
                'max_students'    => 6,
                'hide_when_full'  => true,
            ],
        ];

        $classIds = [];
        foreach ($classes as $c) {
            $curriculum = $c['curriculum'];
            unset($c['curriculum']);
            $classIds[] = SchoolClass::updateOrCreate(['curriculum' => $curriculum], $c)->id;
        }

        // ─── Coupons ─────────────────────────────────────────────────────────
        Coupon::firstOrCreate(['code' => 'WELCOME10'], [
            'discount_type'  => 'percent',
            'discount_value' => 10,
            'min_amount'     => 0,
            'max_uses'       => 100,
            'used_count'     => 0,
            'expires_at'     => now()->addMonths(6),
            'active'         => true,
        ]);

        Coupon::firstOrCreate(['code' => 'SUMMER25'], [
            'discount_type'  => 'fixed',
            'discount_value' => 25,
            'min_amount'     => 100,
            'max_uses'       => null,
            'used_count'     => 0,
            'expires_at'     => now()->addMonths(2),
            'active'         => true,
        ]);

        Coupon::firstOrCreate(['code' => 'EXPIRED5'], [
            'discount_type'  => 'percent',
            'discount_value' => 5,
            'min_amount'     => 0,
            'max_uses'       => null,
            'used_count'     => 0,
            'expires_at'     => now()->subMonth(),
            'active'         => true,
        ]);

        // ─── Sample parent + completed paid enrollments (for certificates) ──
        $parent = User::firstOrCreate(
            ['email' => 'ce.demo.parent@example.com'],
            [
                'name'     => 'Jordan Lee',
                'password' => Hash::make('Password123!'),
                'role'     => 'parent',
                'phone'    => '+1 416 555 0142',
            ]
        );

        $enrollment = Enrollment::firstOrCreate(
            ['parent_email' => 'ce.demo.parent@example.com', 'source' => 'continuing_education_seed'],
            [
                'user_id'           => $parent->id,
                'parent_name'       => 'Jordan Lee',
                'parent_phone'      => '+1 416 555 0142',
                'total_amount'      => 349.00,
                'status'            => 'confirmed',
                'booking_date'      => now()->subMonths(2),
                'registration_type' => 'individual',
                'is_paid'           => true,
                'source'            => 'continuing_education_seed',
            ]
        );

        $studentNames = [['Maya', 'Lee'], ['Noah', 'Lee']];
        foreach ($studentNames as [$first, $last]) {
            TrialEnrollmentStudent::firstOrCreate(
                [
                    'enrollment_id' => $enrollment->id,
                    'first_name'    => $first,
                    'last_name'     => $last,
                ],
                [
                    'orbund_unique_id' => null,
                    'date_of_birth'    => '2015-04-10',
                    'orbund_class_id'  => (string) $classIds[0],
                    'class_date'       => '2026-09-12',
                    'class_time'       => '10:00 AM',
                    'location'         => 'Thornhill',
                    'course'           => 'Robotics',
                    'price'            => 349.00,
                    'attended'         => true,
                ]
            );
        }

        // ─── Waitlist entry on the full class ────────────────────────────────
        SchoolClassWaitlist::firstOrCreate(
            ['school_class_id' => $classIds[2], 'parent_email' => 'waitlist.demo@example.com'],
            [
                'parent_name'   => 'Priya Nair',
                'parent_phone'  => '+1 647 555 0199',
                'student_name'  => 'Ishaan Nair',
                'date_of_birth' => '2012-06-01',
                'position'      => 1,
                'status'        => 'waiting',
            ]
        );

        // ─── Corporate portal: a company with its own discount coupon ────────
        $corpCoupon = Coupon::firstOrCreate(['code' => 'TECHCORP-EMP'], [
            'discount_type'  => 'percent',
            'discount_value' => 15,
            'min_amount'     => 0,
            'max_uses'       => null,
            'used_count'     => 0,
            'expires_at'     => null,
            'active'         => true,
        ]);

        Company::firstOrCreate(['code' => 'TECHCORP'], [
            'name'               => 'TechCorp Inc.',
            'contact_email'      => 'hr@techcorp-demo.example.com',
            'discount_coupon_id' => $corpCoupon->id,
            'active'             => true,
        ]);

        // ─── An unpaid invoice, ready for the admin to mark paid ─────────────
        $invoiceEnrollment = Enrollment::firstOrCreate(
            ['parent_email' => 'invoice.demo@example.com', 'source' => 'continuing_education_seed'],
            [
                'user_id'           => $parent->id,
                'parent_name'       => 'Sam Patel',
                'parent_phone'      => '+1 905 555 0110',
                'total_amount'      => 299.00,
                'status'            => 'pending',
                'booking_date'      => now()->subDays(3),
                'registration_type' => 'individual',
                'is_paid'           => false,
                'source'            => 'continuing_education_seed',
            ]
        );

        $invoicePayment = Payment::firstOrCreate(
            ['enrollment_id' => $invoiceEnrollment->id],
            [
                'user_id'        => $parent->id,
                'amount'         => 299.00,
                'currency'       => 'CAD',
                'payment_method' => 'invoice',
                'status'         => 'pending',
                'payment_plan'   => [['due_date' => now()->addDays(14)->toDateString(), 'amount' => 299.00, 'paid' => false]],
            ]
        );

        Invoice::firstOrCreate(
            ['enrollment_id' => $invoiceEnrollment->id],
            [
                'payment_id'     => $invoicePayment->id,
                'invoice_number' => 'INV-2026-DEMO0001',
                'amount'         => 299.00,
                'method'         => 'invoice',
                'status'         => 'unpaid',
                'due_date'       => now()->addDays(14),
                'parent_name'    => 'Sam Patel',
                'parent_email'   => 'invoice.demo@example.com',
            ]
        );

        $this->command->info('Continuing education demo data seeded: ' . count($classIds) . ' paid classes, 3 coupons, 1 completed enrollment (2 students), 1 waitlist entry, 1 company, 1 unpaid invoice.');
    }
}
