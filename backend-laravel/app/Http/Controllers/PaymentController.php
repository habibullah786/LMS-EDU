<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProcessPaymentRequest;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Services\PaymentLifecycleService;
use App\Services\RazorpayService;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    public function __construct(
        private RazorpayService $razorpay,
        private PaymentLifecycleService $paymentLifecycle,
    ) {}

    public function createPayment($enrollmentId): JsonResponse
    {
        $enrollment = Enrollment::findOrFail($enrollmentId);
        abort_unless($enrollment->user_id === request()->user()->id, 404);

        if ($enrollment->is_paid) {
            return response()->json(['success' => false, 'message' => 'This enrollment has already been paid.'], 409);
        }

        $payment = Payment::firstOrCreate([
            'enrollment_id' => $enrollment->id,
            'status' => 'pending',
        ], [
            'user_id' => $enrollment->user_id,
            'amount' => $enrollment->total_amount,
            'currency' => 'CAD',
            'expires_at' => now()->addMinutes(15),
        ]);

        if (!$payment->gateway_order_id) {
            $order = $this->razorpay->createOrder($payment);
            $payment->update(['gateway_order_id' => $order['id']]);
        }

        return response()->json(['success' => true, 'data' => [
            'payment_id' => $payment->id,
            'enrollment_id' => $enrollment->id,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'razorpay_order_id' => $payment->gateway_order_id,
            'razorpay_key' => config('services.razorpay.key_id'),
            'reservation_expires_at' => $payment->expires_at,
        ]]);
    }

    public function processPayment(ProcessPaymentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $enrollment = Enrollment::findOrFail($data['enrollment_id']);
        abort_unless($enrollment->user_id === $request->user()->id, 404);

        $payment = Payment::where('enrollment_id', $enrollment->id)->latest()->firstOrFail();
        $valid = hash_equals((string) $payment->gateway_order_id, $data['razorpay_order_id'])
            && $this->razorpay->validCheckoutSignature(
                $data['razorpay_order_id'], $data['razorpay_payment_id'], $data['razorpay_signature']
            );

        if (!$valid) {
            return response()->json(['success' => false, 'message' => 'Invalid payment signature.'], 422);
        }

        $this->paymentLifecycle->complete($payment, $data['razorpay_payment_id'], [
            'razorpay_payment_id' => $data['razorpay_payment_id'],
            'razorpay_order_id' => $data['razorpay_order_id'],
        ]);

        return response()->json(['success' => true, 'message' => 'Payment verified.', 'data' => [
            'enrollment_id' => $enrollment->id,
            'payment_id' => $payment->id,
            'status' => 'completed',
        ]]);
    }

    public function showPayment($paymentId): JsonResponse
    {
        $payment = Payment::with('enrollment')->findOrFail($paymentId);
        abort_unless($payment->user_id === request()->user()->id || request()->user()->isAdmin(), 404);
        return response()->json(['success' => true, 'data' => $payment]);
    }

    public function listUserPayments(): JsonResponse
    {
        $payments = Payment::where('user_id', request()->user()->id)
            ->with('enrollment')->latest()->get();
        return response()->json(['success' => true, 'data' => $payments]);
    }
}
