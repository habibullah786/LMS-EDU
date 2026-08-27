<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CourseClass;
use App\Models\Payment;
use App\Models\SchoolClass;
use Illuminate\Support\Facades\DB;

class PaymentLifecycleService
{
    public function __construct(private LeadProcessService $leadProcess, private LeadLifecycleService $leadLifecycle) {}

    public function complete(Payment $payment, string $transactionId, array $metadata = []): void
    {
        $enrollment = DB::transaction(function () use ($payment, $transactionId, $metadata) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'completed') return $locked->enrollment;
            if ($locked->status !== 'pending') return null;

            $locked->markAsCompleted($transactionId, $metadata);
            $locked->enrollment()->update(['is_paid' => true, 'status' => 'active']);
            Cart::where('user_id', $locked->user_id)->where('status', 'open')->update(['status' => 'checked_out']);
            return $locked->enrollment;
        });
        if ($enrollment?->lead) $this->leadProcess->activatePaidEnrollment($enrollment->lead, $enrollment);
    }

    public function failAndRelease(Payment $payment, string $reason): void
    {
        $releasedEnrollment = DB::transaction(function () use ($payment, $reason) {
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'pending') return null;

            $enrollment = $locked->enrollment()->with('students')->lockForUpdate()->firstOrFail();
            if ($enrollment->school_class_id) {
                $class = SchoolClass::whereKey($enrollment->school_class_id)->lockForUpdate()->first();
                if ($class && $class->available_slots < $class->max_students) $class->increment('available_slots');
            } else {
                foreach ($enrollment->students->groupBy('class_id') as $classId => $students) {
                    $class = CourseClass::whereKey($classId)->lockForUpdate()->first();
                    $class?->incrementSeats($students->count());
                }
            }
            $locked->markAsFailed($reason);
            $enrollment->update(['status' => 'payment_failed']);
            return $enrollment;
        });
        if ($releasedEnrollment?->lead) $this->leadLifecycle->transition($releasedEnrollment->lead, 'decides_to_enroll', null, $reason, 'payment_reservation_expired');
    }
}
