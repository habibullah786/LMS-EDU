<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CourseClass;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentLifecycleService
{
    public function complete(Payment $payment, string $transactionId, array $metadata = []): void
    {
        DB::transaction(function () use ($payment, $transactionId, $metadata) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'completed') return;
            if ($locked->status !== 'pending') return;

            $locked->markAsCompleted($transactionId, $metadata);
            $locked->enrollment()->update(['is_paid' => true, 'status' => 'active']);
            Cart::where('user_id', $locked->user_id)->where('status', 'open')->update(['status' => 'checked_out']);
        });
    }

    public function failAndRelease(Payment $payment, string $reason): void
    {
        DB::transaction(function () use ($payment, $reason) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'pending') return;

            $enrollment = $locked->enrollment()->with('students')->lockForUpdate()->firstOrFail();
            foreach ($enrollment->students->groupBy('class_id') as $classId => $students) {
                $class = CourseClass::whereKey($classId)->lockForUpdate()->first();
                $class?->incrementSeats($students->count());
            }
            $locked->markAsFailed($reason);
            $enrollment->update(['status' => 'payment_failed']);
        });
    }
}
