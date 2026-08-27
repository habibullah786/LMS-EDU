<?php

namespace App\Services;

use App\Jobs\SyncEnrollmentToOrbund;
use App\Models\Enrollment;
use App\Models\EnrollmentStudent;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\TrialEnrollmentStudent;
use App\Models\User;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LeadProcessService
{
    public function __construct(private LeadLifecycleService $lifecycle, private NotificationService $notifications) {}

    public function bookTrial(Lead $lead, array $data, ?User $actor): Enrollment
    {
        $enrollment = DB::transaction(function () use ($lead, $data, $actor) {
            $class = $this->reserveClass((int) $data['school_class_id'], 'Trial');
            $user = $this->parentFor($lead);
            $location = $class->locations[0] ?? $lead->location ?? '';
            $enrollment = Enrollment::create([
                'user_id' => $user->id, 'lead_id' => $lead->id, 'school_class_id' => $class->id,
                'parent_name' => $lead->name, 'parent_email' => $lead->email, 'parent_phone' => $lead->phone,
                'total_amount' => 0, 'status' => 'pending', 'booking_date' => now(),
                'registration_type' => 'individual', 'source' => $data['booked_by'] ?? 'admin',
                'enrollment_source' => 'trial', 'term' => $class->semester,
            ]);
            TrialEnrollmentStudent::create([
                'enrollment_id' => $enrollment->id, 'school_class_id' => $class->id,
                'first_name' => $data['first_name'], 'last_name' => $data['last_name'],
                'date_of_birth' => $data['date_of_birth'] ?? null, 'orbund_class_id' => $class->curriculum,
                'class_date' => $class->date, 'class_time' => $class->time, 'location' => $location,
                'course' => $class->course, 'price' => 0,
            ]);
            $lead->update(['is_registered' => true, 'registered_at' => $lead->registered_at ?? now(), 'user_id' => $user->id]);
            return $enrollment->load('trialStudents', 'schoolClass');
        });

        $this->lifecycle->transition($lead, 'pre_registered', $actor, 'Trial booked', 'trial_booked');
        $student = $enrollment->trialStudents->first();
        $this->notifications->trialBooked($this->payload($enrollment, $student));
        return $enrollment;
    }

    public function rescheduleTrial(TrialEnrollmentStudent $student, array $data, ?User $actor): TrialEnrollmentStudent
    {
        DB::transaction(function () use ($student, $data) {
            $student->load('enrollment');
            $oldClassId = $student->school_class_id;
            $newClassId = (int) $data['school_class_id'];
            if ($oldClassId !== $newClassId) {
                $class = $this->reserveClass($newClassId, 'Trial');
                if ($oldClassId && $student->enrollment->status !== 'cancelled') SchoolClass::whereKey($oldClassId)->lockForUpdate()->increment('available_slots');
            } else {
                $class = SchoolClass::lockForUpdate()->findOrFail($newClassId);
            }
            $student->update([
                'school_class_id' => $class->id, 'orbund_class_id' => $class->curriculum,
                'class_date' => $class->date, 'class_time' => $class->time,
                'location' => $class->locations[0] ?? '', 'course' => $class->course,
                'attended' => null, 'attendance_marked_at' => null, 'attendance_marked_by' => null,
                'reminder_invalidated_at' => now(),
            ]);
            $student->enrollment->update([
                'school_class_id' => $class->id, 'status' => 'pending',
                'confirmation_request_sent_at' => null, 'confirmation_responded_at' => null,
                'confirmation_response_channel' => null,
            ]);
        });

        $lead = $student->enrollment?->lead;
        if ($lead) {
            $this->lifecycle->transition($lead, 'pre_registered', $actor, $data['reason'], 'trial_rescheduled');
            $this->notifications->trialBooked($this->payload($student->enrollment, $student->fresh()));
        }
        return $student->fresh();
    }

    public function recordDecision(Lead $lead, array $data, User $actor): void
    {
        $student = TrialEnrollmentStudent::whereHas('enrollment', fn ($q) => $q->where('lead_id', $lead->id))->latest()->firstOrFail();
        $student->update([
            'enroll_decision' => $data['decision'], 'enroll_decision_at' => now(),
            'enroll_decision_by' => $actor->id,
            'not_enrolled_reason_code' => $data['decision'] === 'no' ? ($data['reason_code'] ?? null) : null,
            'not_enrolled_notes' => $data['notes'] ?? null,
        ]);
        $target = $data['decision'] === 'no' ? 'did_not_enroll' : 'decides_to_enroll';
        $this->lifecycle->transition($lead, $target, $actor, $data['notes'] ?? null, 'enrollment_decision_recorded');
        if ($data['decision'] === 'no') $this->startNurture($lead);
    }

    public function createPaidEnrollment(Lead $lead, array $data, User $actor): Enrollment
    {
        $enrollment = DB::transaction(function () use ($lead, $data, $actor) {
            $class = $this->reserveClass((int) $data['school_class_id'], 'Paid');
            $user = $this->parentFor($lead);
            $paid = $data['payment_status'] === 'paid';
            $location = $class->locations[0] ?? $lead->location ?? '';
            $trialStudent = TrialEnrollmentStudent::whereHas('enrollment', fn ($q) => $q->where('lead_id', $lead->id))->latest()->first();
            $studentName = trim(($data['first_name'] ?? $trialStudent?->first_name ?? '').' '.($data['last_name'] ?? $trialStudent?->last_name ?? ''));
            $dateOfBirth = $data['date_of_birth'] ?? $trialStudent?->date_of_birth?->toDateString();
            if (!$studentName || !$dateOfBirth) throw ValidationException::withMessages(['student' => 'Student name and date of birth are required.']);
            $student = Student::firstOrCreate(['user_id' => $user->id, 'name' => $studentName, 'date_of_birth' => $dateOfBirth]);
            $enrollment = Enrollment::create([
                'user_id' => $user->id, 'lead_id' => $lead->id, 'school_class_id' => $class->id,
                'parent_name' => $lead->name, 'parent_email' => $lead->email, 'parent_phone' => $lead->phone,
                'total_amount' => $data['amount'], 'status' => $paid ? 'active' : 'pending_payment',
                'booking_date' => now(), 'enrollment_date' => $paid ? now() : null,
                'registration_type' => 'individual', 'is_paid' => $paid,
                'source' => $data['source'], 'enrollment_source' => $data['source'],
                'term' => $data['term'] ?? $class->semester,
                'waiver_signed_at' => !empty($data['waiver_signed']) ? now() : null,
                'activated_at' => $paid ? now() : null,
            ]);
            EnrollmentStudent::create([
                'enrollment_id' => $enrollment->id, 'student_id' => $student->id,
                'class_id' => (string) $class->id, 'class_name' => $class->curriculum,
                'course' => $class->course, 'location' => $location,
                'instructor' => $class->instructor, 'price' => $data['amount'], 'type' => 'Paid',
            ]);
            Payment::create([
                'enrollment_id' => $enrollment->id, 'user_id' => $user->id,
                'amount' => $data['amount'], 'currency' => 'CAD',
                'payment_method' => $data['payment_method'] ?? null, 'transaction_id' => $data['transaction_id'] ?? null,
                'status' => $paid ? 'completed' : 'pending', 'processed_at' => $paid ? now() : null,
                'expires_at' => $paid ? null : now()->addMinutes(30),
                'metadata' => ['source' => $data['source'], 'recorded_by' => $actor->id],
            ]);
            return $enrollment->load('students', 'payments', 'schoolClass');
        });

        if ($enrollment->is_paid) $this->activatePaidEnrollment($lead, $enrollment, $actor);
        return $enrollment;
    }

    public function assignClass(Enrollment $enrollment, SchoolClass $newClass, User $actor): Enrollment
    {
        DB::transaction(function () use ($enrollment, $newClass) {
            $locked = Enrollment::whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            if ($locked->school_class_id === $newClass->id) return;
            $reserved = $this->reserveClass($newClass->id, 'Paid');
            if ($locked->is_paid && abs((float) $locked->total_amount - (float) $reserved->price) > 0.01) {
                throw ValidationException::withMessages(['school_class_id' => 'A paid enrollment can only move to a class with the same price.']);
            }
            if ($locked->school_class_id) SchoolClass::whereKey($locked->school_class_id)->lockForUpdate()->increment('available_slots');
            $locked->update(['school_class_id' => $reserved->id, 'term' => $reserved->semester] + ($locked->is_paid ? [] : ['total_amount' => $reserved->price]));
            $locked->students()->update([
                'class_id' => (string) $reserved->id, 'class_name' => $reserved->curriculum,
                'course' => $reserved->course, 'location' => $reserved->locations[0] ?? '',
                'instructor' => $reserved->instructor, 'price' => $reserved->price,
            ]);
        });
        if ($enrollment->lead) $this->lifecycle->record($enrollment->lead, 'roster_assigned', $actor, null, null, ['class_id' => $newClass->id]);
        return $enrollment->fresh()->load('students', 'schoolClass');
    }

    public function completeManualPayment(Enrollment $enrollment, array $data, User $actor): Enrollment
    {
        if ($enrollment->is_paid) return $enrollment->load('payments', 'students', 'schoolClass');
        DB::transaction(function () use ($enrollment, $data, $actor) {
            $locked = Enrollment::whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            if ($locked->is_paid) return;
            $payment = $locked->payments()->where('status', 'pending')->latest()->first();
            if ($payment) $payment->update(['amount' => $data['amount'], 'payment_method' => $data['payment_method'], 'transaction_id' => $data['transaction_id'] ?? null, 'status' => 'completed', 'processed_at' => now(), 'expires_at' => null, 'metadata' => ['source' => $locked->enrollment_source, 'recorded_by' => $actor->id]]);
            else Payment::create(['enrollment_id' => $locked->id, 'user_id' => $locked->user_id, 'amount' => $data['amount'], 'currency' => 'CAD', 'payment_method' => $data['payment_method'], 'transaction_id' => $data['transaction_id'] ?? null, 'status' => 'completed', 'processed_at' => now(), 'metadata' => ['source' => $locked->enrollment_source, 'recorded_by' => $actor->id]]);
            $locked->update(['total_amount' => $data['amount'], 'is_paid' => true, 'status' => 'active', 'enrollment_date' => now(), 'activated_at' => now()]);
        });
        $fresh = $enrollment->fresh()->load('payments', 'students', 'schoolClass', 'lead');
        if ($fresh->lead) $this->activatePaidEnrollment($fresh->lead, $fresh, $actor);
        return $fresh;
    }

    public function activatePaidEnrollment(Lead $lead, Enrollment $enrollment, ?User $actor = null, bool $queueOrbund = true): void
    {
        $enrollment->update(['status' => 'active', 'is_paid' => true, 'activated_at' => $enrollment->activated_at ?? now()]);
        $lead->nurtureSteps()->where('status', 'scheduled')->update(['status' => 'cancelled']);
        $this->lifecycle->transition($lead, 'enrolled_term_1', $actor, 'Paid enrollment activated', 'enrollment_activated');
        $this->notifications->paidEnrollmentComplete($enrollment->fresh()->load('students', 'payments', 'schoolClass'));
        if ($queueOrbund) {
            $enrollment->update(['orbund_sync_status' => 'queued', 'orbund_sync_error' => null]);
            SyncEnrollmentToOrbund::dispatch($enrollment->id);
        }
    }

    private function startNurture(Lead $lead): void
    {
        if (!$lead->marketing_email_consent && !$lead->marketing_sms_consent) return;
        foreach ([1 => 1, 2 => 3, 3 => 7] as $step => $days) {
            $lead->nurtureSteps()->firstOrCreate(['step' => $step], ['scheduled_at' => now()->addDays($days), 'status' => 'scheduled']);
        }
    }

    private function reserveClass(int $id, string $type): SchoolClass
    {
        $class = SchoolClass::whereKey($id)->lockForUpdate()->firstOrFail();
        if ($class->type !== $type) throw ValidationException::withMessages(['school_class_id' => "Select a {$type} class."]);
        if ($class->available_slots < 1) throw ValidationException::withMessages(['school_class_id' => 'This class is full.']);
        $class->decrement('available_slots');
        return $class->fresh();
    }

    private function parentFor(Lead $lead): User
    {
        $user = User::whereRaw('LOWER(email) = ?', [strtolower($lead->email)])->first();
        if ($user) return $user;
        return User::create(['name' => $lead->name, 'email' => strtolower($lead->email), 'phone' => $lead->phone, 'password' => Hash::make(Str::random(32)), 'role' => 'parent']);
    }

    private function payload(Enrollment $enrollment, ?TrialEnrollmentStudent $student): array
    {
        return ['parentName' => $enrollment->parent_name, 'parentEmail' => $enrollment->parent_email, 'parentPhone' => $enrollment->parent_phone,
            'childName' => $student ? trim($student->first_name.' '.$student->last_name) : '', 'className' => $student?->orbund_class_id ?? '',
            'location' => $student?->location ?? '', 'date' => $student?->class_date?->toDateString() ?? '', 'time' => $student?->class_time ?? ''];
    }
}
