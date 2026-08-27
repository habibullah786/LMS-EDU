<?php

namespace App\Http\Controllers;

use App\Exceptions\CheckoutException;
use App\Models\Cart;
use App\Models\CourseClass;
use App\Models\Enrollment;
use App\Models\EnrollmentStudent;
use App\Models\Payment;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Services\PaymentLifecycleService;
use App\Services\RazorpayService;
use Throwable;

class CheckoutController extends Controller
{
    public function __construct(
        private RazorpayService $razorpay,
        private PaymentLifecycleService $paymentLifecycle,
    ) {}
    /**
     * Checkout the current parent's open cart.
     *
     * Free items (total = 0) activate immediately with no payment step.
     * Paid items create a pending Payment record — the actual payment
     * gateway call (Razorpay/Stripe) is intentionally not wired up yet;
     * see plan.md §5/§8. The enrollment is created as 'pending_payment'
     * so it has something to reconcile against once a gateway is added.
     */
    public function checkout(): JsonResponse
    {
        $user = auth()->user();
        $lead = Lead::whereRaw('LOWER(email) = ?', [strtolower($user->email)])->latest()->first();

        $cart = Cart::where('user_id', $user->id)->where('status', 'open')->first();

        if (!$cart || $cart->items()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Your cart is empty.',
            ], 404);
        }

        try {
            $result = DB::transaction(function () use ($cart, $user, $lead) {
                $items = $cart->items()->with('student')->get();
                $total = 0;
                $enrollmentStudentRows = [];

                foreach ($items as $item) {
                    // Row-lock the class for the duration of this transaction so two
                    // concurrent checkouts can't both pass the seat check.
                    $class = CourseClass::with('course')->where('id', $item->class_id)->lockForUpdate()->first();

                    if (!$class || !$class->hasAvailableSeats()) {
                        throw new CheckoutException(
                            'class_full',
                            "The class for {$item->student->name} is full.",
                            ['class_id' => $item->class_id],
                        );
                    }

                    $alreadyEnrolled = EnrollmentStudent::where('student_id', $item->student_id)
                        ->where('class_id', (string) $class->id)
                        ->exists();

                    if ($alreadyEnrolled) {
                        throw new CheckoutException(
                            'duplicate_enrollment',
                            "{$item->student->name} is already enrolled in this class.",
                            ['student_id' => $item->student_id, 'class_id' => $class->id],
                        );
                    }

                    // Live price, not the cart's snapshot — the snapshot is for display only.
                    $price = $class->course->price;
                    $total += $price;

                    $enrollmentStudentRows[] = [
                        'student_id' => $item->student_id,
                        'class_id' => (string) $class->id,
                        'class_name' => $class->course->name,
                        'course' => $class->course->name,
                        'location' => $class->location,
                        'instructor' => $class->instructor ?? '',
                        'price' => $price,
                        'type' => $price == 0 ? 'Trial' : 'Paid',
                    ];

                    $class->decrementSeats();
                }

                $enrollment = Enrollment::create([
                    'user_id' => $user->id,
                    'parent_name' => $user->name,
                    'parent_email' => $user->email,
                    'parent_phone' => $user->phone ?? null,
                    'total_amount' => $total,
                    'status' => $total == 0 ? 'active' : 'pending_payment',
                    'registration_type' => 'individual',
                    'is_paid' => $total == 0,
                    'booking_date' => now(),
                    'lead_id' => $lead?->id,
                    'source' => 'web',
                    'enrollment_source' => 'web',
                ]);

                foreach ($enrollmentStudentRows as $row) {
                    $enrollment->students()->create($row);
                }

                $payment = null;
                if ($total > 0) {
                    $payment = Payment::create([
                        'enrollment_id' => $enrollment->id,
                        'user_id' => $user->id,
                        'amount' => $total,
                        'currency' => 'CAD',
                        'status' => 'pending',
                        'expires_at' => now()->addMinutes(15),
                    ]);
                }

                if ($total == 0) {
                    $cart->update(['status' => 'checked_out']);
                }

                return ['enrollment' => $enrollment, 'payment' => $payment];
            });
        } catch (CheckoutException $e) {
            return response()->json(array_merge([
                'success' => false,
                'error' => $e->errorCode,
                'message' => $e->getMessage(),
            ], $e->context), 409);
        }

        $gatewayOrder = null;
        if ($result['payment']) {
            try {
                $gatewayOrder = $this->razorpay->createOrder($result['payment']);
                $result['payment']->update(['gateway_order_id' => $gatewayOrder['id']]);
            } catch (Throwable $e) {
                report($e);
                $this->paymentLifecycle->failAndRelease($result['payment'], 'Unable to initialize payment gateway');
                return response()->json([
                    'success' => false,
                    'message' => 'Payment is temporarily unavailable. No seat was reserved.',
                ], 503);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'enrollment' => $result['enrollment'],
                'requires_payment' => (float) $result['enrollment']->total_amount > 0,
                'payment_id' => $result['payment']->id ?? null,
                'razorpay_order_id' => $gatewayOrder['id'] ?? null,
                'razorpay_key' => $gatewayOrder ? config('services.razorpay.key_id') : null,
                'reservation_expires_at' => $result['payment']?->expires_at,
            ],
        ], 201);
    }
}
