<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrbundPaymentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enrollment_id'         => 'required|integer|exists:enrollments,id',
            'amount'                => 'required|numeric|min:0',
            'orbund_transaction_id' => 'nullable|string|max:255',
            'payment_method'        => 'nullable|string|max:50',
        ]);

        $enrollment = Enrollment::findOrFail($data['enrollment_id']);

        if ($enrollment->is_paid) {
            return response()->json([
                'message'    => 'Enrollment already marked as paid',
                'payment_id' => optional($enrollment->payments()->latest()->first())->id,
            ]);
        }

        $payment = Payment::create([
            'enrollment_id'  => $enrollment->id,
            'user_id'        => $enrollment->user_id,
            'amount'         => $data['amount'],
            'currency'       => 'CAD',
            'payment_method' => $data['payment_method'] ?? 'orbund',
            'transaction_id' => $data['orbund_transaction_id'] ?? null,
            'status'         => 'completed',
            'processed_at'   => now(),
            'metadata'       => ['source' => 'orbund'],
        ]);

        $enrollment->update([
            'is_paid' => true,
            'status'  => 'confirmed',
        ]);

        return response()->json([
            'message'    => 'Payment recorded successfully',
            'payment_id' => $payment->id,
        ], 201);
    }
}
