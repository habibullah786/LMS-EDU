<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Coupon;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\SchoolClassWaitlist;
use App\Models\TrialEnrollmentStudent;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Native (non-Orbund) continuing-education registration: individual or group,
 * course discovery by program/location/department, payment methods
 * (simulated card charge / invoice / purchase order), and payment plans.
 */
class ContinuingEducationController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    /**
     * GET /continuing-education/classes — course listing by program (course),
     * location, or department. Only "Paid" continuing-education classes.
     */
    public function classes(Request $request): JsonResponse
    {
        $query = SchoolClass::where('type', 'Paid');

        if ($request->filled('course')) {
            $query->where('course', $request->query('course'));
        }
        if ($request->filled('department')) {
            $query->where('department', $request->query('department'));
        }

        $classes = $query->get()->filter(function (SchoolClass $cls) use ($request) {
            $location = $request->query('location');
            if ($location && !in_array($location, $cls->locations ?? [])) {
                return false;
            }
            if ($cls->hide_when_full && $cls->isFull()) {
                return false;
            }
            return true;
        })->values();

        return response()->json($classes);
    }

    /**
     * POST /continuing-education/register
     *
     * Individual (1 student) or group/batch (many students) registration for
     * one paid class, with an optional coupon or corporate code, a payment
     * method, and an optional installment plan. This is the single endpoint
     * that automates registration all the way through to payment.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parent_name'    => ['required', 'string', 'max:255'],
            'parent_email'   => ['required', 'email', 'max:255'],
            'parent_phone'   => ['nullable', 'string', 'max:30'],
            'school_class_id'=> ['required', 'integer', 'exists:school_classes,id'],
            'coupon_code'    => ['nullable', 'string', 'max:50'],
            'company_code'   => ['nullable', 'string', 'max:50'],
            'payment_method' => ['required', 'in:card,invoice,purchase_order'],
            'purchase_order_number' => ['nullable', 'string', 'max:100', 'required_if:payment_method,purchase_order'],
            'installments'   => ['nullable', 'integer', 'min:1', 'max:12'],
            'group_name'     => ['nullable', 'string', 'max:255'],
            'students'       => ['required', 'array', 'min:1'],
            'students.*.first_name'   => ['required', 'string', 'max:100'],
            'students.*.last_name'    => ['required', 'string', 'max:100'],
            'students.*.date_of_birth'=> ['nullable', 'date'],
        ]);

        $schoolClass = SchoolClass::findOrFail($data['school_class_id']);
        $studentCount = count($data['students']);

        // ── Pricing: base price × students, minus coupon / corporate discount ──
        $baseAmount = $schoolClass->price * $studentCount;
        $totalAmount = $baseAmount;
        $discount = 0;
        $appliedCoupon = null;

        if (!empty($data['company_code'])) {
            $company = Company::where('code', $data['company_code'])->where('active', true)->first();
            if ($company && $company->discountCoupon && $company->discountCoupon->isValidFor($baseAmount)) {
                $appliedCoupon = $company->discountCoupon;
            }
        }
        if (!$appliedCoupon && !empty($data['coupon_code'])) {
            $coupon = Coupon::whereRaw('UPPER(code) = ?', [strtoupper($data['coupon_code'])])->first();
            if ($coupon && $coupon->isValidFor($baseAmount)) {
                $appliedCoupon = $coupon;
            }
        }
        if ($appliedCoupon) {
            $discount = $appliedCoupon->discountFor($baseAmount);
            $totalAmount = round($baseAmount - $discount, 2);
        }

        // ── Not enough seats → waitlist every student instead of enrolling ──
        if ($schoolClass->available_slots < $studentCount) {
            $entries = [];
            foreach ($data['students'] as $student) {
                $position = SchoolClassWaitlist::where('school_class_id', $schoolClass->id)
                    ->where('status', 'waiting')->count() + 1;

                $entries[] = SchoolClassWaitlist::create([
                    'school_class_id' => $schoolClass->id,
                    'parent_name'     => $data['parent_name'],
                    'parent_email'    => $data['parent_email'],
                    'parent_phone'    => $data['parent_phone'] ?? null,
                    'student_name'    => trim($student['first_name'] . ' ' . $student['last_name']),
                    'date_of_birth'   => $student['date_of_birth'] ?? null,
                    'position'        => $position,
                    'status'          => 'waiting',
                ]);
            }

            $this->notifications->waitlistJoined([
                'parentName'  => $data['parent_name'],
                'parentEmail' => $data['parent_email'],
                'childName'   => trim($data['students'][0]['first_name'] . ' ' . $data['students'][0]['last_name']),
                'className'   => $schoolClass->curriculum,
                'position'    => $entries[0]->position ?? null,
            ]);

            return response()->json([
                'type'    => 'waitlist',
                'message' => 'This class is full — you have been added to the waitlist.',
                'data'    => $entries,
            ], 201);
        }

        // ── Enough seats → find/create the parent account, enroll, pay ──
        $user = User::where('email', $data['parent_email'])->first();
        if (!$user) {
            $user = User::create([
                'name'           => $data['parent_name'],
                'email'          => $data['parent_email'],
                'password'       => Hash::make(Str::random(16)),
                'phone'          => $data['parent_phone'] ?? null,
                'role'           => 'parent',
                'remember_token' => Str::random(60),
            ]);
        }

        $isFree = $totalAmount <= 0;

        $result = DB::transaction(function () use ($data, $schoolClass, $studentCount, $user, $totalAmount, $isFree, $appliedCoupon) {
            $enrollment = Enrollment::create([
                'user_id'           => $user->id,
                'parent_name'       => $data['parent_name'],
                'parent_email'      => $data['parent_email'],
                'parent_phone'      => $data['parent_phone'] ?? '',
                'total_amount'      => $totalAmount,
                'status'            => $isFree ? 'confirmed' : 'pending',
                'booking_date'      => now(),
                'registration_type' => $studentCount > 1 ? 'batch' : 'individual',
                'is_paid'           => $isFree,
                'source'            => 'continuing_education',
                'group_reference_id'=> $studentCount > 1 ? (string) Str::uuid() : null,
            ]);

            foreach ($data['students'] as $student) {
                TrialEnrollmentStudent::create([
                    'enrollment_id'   => $enrollment->id,
                    'first_name'      => $student['first_name'],
                    'last_name'       => $student['last_name'],
                    'date_of_birth'   => $student['date_of_birth'] ?? null,
                    'orbund_class_id' => (string) $schoolClass->id,
                    'class_date'      => $schoolClass->date,
                    'class_time'      => $schoolClass->time,
                    'location'        => $schoolClass->locations[0] ?? null,
                    'course'          => $schoolClass->course,
                    'price'           => $schoolClass->price,
                ]);
            }

            $schoolClass->decrement('available_slots', $studentCount);

            if ($appliedCoupon) {
                $appliedCoupon->increment('used_count');
            }

            $payment = null;
            $invoice = null;

            if (!$isFree) {
                $installments = max(1, (int) ($data['installments'] ?? 1));
                $payment = Payment::create([
                    'enrollment_id'  => $enrollment->id,
                    'user_id'        => $user->id,
                    'amount'         => $totalAmount,
                    'currency'       => 'CAD',
                    'payment_method' => $data['payment_method'],
                    'status'         => 'pending',
                    'payment_plan'   => $this->buildInstallmentPlan($totalAmount, $installments),
                ]);

                if ($data['payment_method'] === 'card') {
                    // Simulated card charge — no live payment gateway is configured.
                    $payment->markAsCompleted('SIM-' . strtoupper(Str::random(10)), ['simulated' => true]);
                    $enrollment->update(['is_paid' => true, 'status' => 'confirmed']);
                } else {
                    $invoice = Invoice::create([
                        'payment_id'             => $payment->id,
                        'enrollment_id'          => $enrollment->id,
                        'invoice_number'         => 'INV-' . now()->format('Y') . '-' . strtoupper(Str::random(8)),
                        'amount'                 => $totalAmount,
                        'method'                 => $data['payment_method'],
                        'purchase_order_number'  => $data['purchase_order_number'] ?? null,
                        'status'                 => 'unpaid',
                        'due_date'               => now()->addDays(14),
                        'parent_name'            => $data['parent_name'],
                        'parent_email'           => $data['parent_email'],
                    ]);
                }
            }

            return [$enrollment, $payment, $invoice];
        });

        [$enrollment, $payment, $invoice] = $result;
        $firstStudent = $data['students'][0];
        $notifPayload = [
            'parentName'  => $data['parent_name'],
            'parentEmail' => $data['parent_email'],
            'parentPhone' => $data['parent_phone'] ?? '',
            'childName'   => trim($firstStudent['first_name'] . ' ' . $firstStudent['last_name']),
            'className'   => $schoolClass->curriculum,
            'course'      => $schoolClass->course,
            'location'    => $schoolClass->locations[0] ?? '',
            'instructor'  => $schoolClass->instructor,
            'price'       => $totalAmount,
            'type'        => 'Paid',
        ];

        $this->notifications->fireEventWorkflows('ce_registration_created', $notifPayload);
        $this->notifications->registrationWelcome($notifPayload);
        $this->notifications->enrollmentCreated($notifPayload);

        if ($enrollment->status === 'confirmed') {
            $this->notifications->fireEventWorkflows('ce_registration_confirmed', $notifPayload);
            $this->notifications->enrollmentConfirmed(array_merge($notifPayload, [
                'date' => $schoolClass->date ?? '',
                'time' => $schoolClass->time ?? '',
            ]));
        }

        return response()->json([
            'type'          => $enrollment->status === 'confirmed' ? 'enrolled' : ($invoice ? 'invoice_pending' : 'payment_pending'),
            'message'       => match (true) {
                $enrollment->status === 'confirmed' => 'Registration complete — you are enrolled.',
                (bool) $invoice => 'Registration received — an invoice has been issued.',
                default => 'Registration received — payment is pending.',
            },
            'enrollment_id' => $enrollment->id,
            'total_amount'  => $totalAmount,
            'discount'      => $discount,
            'payment_id'    => $payment?->id,
            'invoice_number'=> $invoice?->invoice_number,
        ], 201);
    }

    private function buildInstallmentPlan(float $total, int $installments): array
    {
        $per = round($total / $installments, 2);
        $plan = [];
        for ($i = 0; $i < $installments; $i++) {
            $plan[] = [
                'due_date' => now()->addMonths($i)->toDateString(),
                'amount'   => $i === $installments - 1 ? round($total - $per * ($installments - 1), 2) : $per,
                'paid'     => $i === 0, // first installment covered by the initial charge/invoice
            ];
        }
        return $plan;
    }
}
