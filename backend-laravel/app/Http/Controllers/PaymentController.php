<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Payment;
use App\Http\Requests\ProcessPaymentRequest;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    /**
     * Create payment record and prepare for processing
     */
    public function createPayment($enrollmentId): JsonResponse
    {
        $enrollment = Enrollment::findOrFail($enrollmentId);

        if ($enrollment->is_paid) {
            return response()->json([
                'success' => false,
                'message' => 'This enrollment has already been paid.',
            ], 400);
        }

        // Create payment record
        $payment = Payment::create([
            'enrollment_id' => $enrollment->id,
            'user_id' => $enrollment->user_id,
            'amount' => $enrollment->total_amount,
            'currency' => 'INR',
            'status' => 'pending',
        ]);

        // In a real scenario, integrate with Razorpay
        // For now, return details for frontend to handle

        return response()->json([
            'success' => true,
            'message' => 'Payment initiated.',
            'data' => [
                'payment_id' => $payment->id,
                'enrollment_id' => $enrollment->id,
                'amount' => $enrollment->total_amount,
                'currency' => 'INR',
                // Razorpay order creation would happen here
                'razorpay_order_id' => 'order_' . uniqid(), // Placeholder
            ],
        ]);
    }

    /**
     * Process payment (verify and mark as completed)
     */
    public function processPayment(ProcessPaymentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $enrollment = Enrollment::findOrFail($data['enrollment_id']);
        $payment = Payment::where('enrollment_id', $enrollment->id)->latest()->firstOrFail();

        try {
            // In production, verify with Razorpay
            // For MVP, we simulate verification
            if ($data['payment_method'] === 'razorpay' && isset($data['razorpay_signature'])) {
                // Verify signature here
                // For now, assume it's valid
                $transactionId = $data['razorpay_payment_id'] ?? 'txn_' . uniqid();
                
                $payment->markAsCompleted($transactionId, [
                    'razorpay_payment_id' => $data['razorpay_payment_id'] ?? null,
                    'razorpay_order_id' => $data['razorpay_order_id'] ?? null,
                ]);

                // Mark enrollment as paid and activate
                $enrollment->update([
                    'is_paid' => true,
                    'status' => 'active',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Payment successful! You are now enrolled.',
                    'data' => [
                        'enrollment_id' => $enrollment->id,
                        'payment_id' => $payment->id,
                        'status' => 'completed',
                    ],
                ]);
            }

            throw new \Exception('Invalid payment method');
        } catch (\Exception $e) {
            $payment->markAsFailed($e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Payment processing failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get payment details
     */
    public function showPayment($paymentId): JsonResponse
    {
        $payment = Payment::with('enrollment', 'user')->findOrFail($paymentId);

        return response()->json([
            'success' => true,
            'data' => $payment,
        ]);
    }

    /**
     * List payments for a user
     */
    public function listUserPayments($userId = null): JsonResponse
    {
        if (!$userId) {
            $userId = auth()->id();
        }

        $payments = Payment::where('user_id', $userId)
            ->with('enrollment')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }
}
