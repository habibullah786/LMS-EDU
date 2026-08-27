<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\Lead;
use App\Services\LeadProcessService;
use App\Services\LeadLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrbundPaymentController extends Controller
{
    public function __construct(private LeadProcessService $leadProcess, private LeadLifecycleService $leadLifecycle) {}

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

        if ($enrollment->lead_id && ($lead = Lead::find($enrollment->lead_id))) {
            $this->leadProcess->activatePaidEnrollment($lead, $enrollment, null, false);
            $enrollment->update(['orbund_sync_status' => 'synced', 'orbund_student_id' => $enrollment->trial_ref_id, 'orbund_sync_at' => now(), 'orbund_sync_error' => null]);
            $this->leadLifecycle->transition($lead, 'confirmed_on_orbund', null, 'Enrollment confirmed by Orbund payment flow', 'orbund_sync_succeeded');
        }

        return response()->json([
            'message'    => 'Payment recorded successfully',
            'payment_id' => $payment->id,
        ], 201);
    }
}
