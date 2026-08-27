<?php

namespace App\Services;

use App\Models\Enrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\SchoolClass;

class TrialConfirmationService
{
    public function __construct(private NotificationService $notifications, private LeadLifecycleService $leadLifecycle) {}

    public function issueToken(Enrollment $enrollment): string
    {
        $token = Str::random(64);
        $enrollment->update([
            'confirmation_token_hash' => hash('sha256', $token),
            'confirmation_token_expires_at' => now()->addHours(36),
        ]);
        return $token;
    }

    public function findByToken(string $token): ?Enrollment
    {
        return Enrollment::with('trialStudents')->where('confirmation_token_hash', hash('sha256', $token))->first();
    }

    public function respond(Enrollment $enrollment, string $action, string $channel): array
    {
        $target = $action === 'confirm' ? 'confirmed' : 'cancelled';

        return DB::transaction(function () use ($enrollment, $target, $channel) {
            $locked = Enrollment::with('trialStudents')->lockForUpdate()->findOrFail($enrollment->id);
            if (in_array($locked->status, ['confirmed', 'cancelled'], true)) {
                return ['status' => $locked->status, 'changed' => false];
            }

            $locked->update([
                'status' => $target,
                'confirmation_responded_at' => now(),
                'confirmation_response_channel' => $channel,
            ]);
            if ($target === 'cancelled' && $locked->school_class_id) {
                SchoolClass::whereKey($locked->school_class_id)->lockForUpdate()->increment('available_slots');
            }

            $student = $locked->trialStudents->first();
            $payload = [
                'parentName' => $locked->parent_name,
                'parentEmail' => $locked->parent_email,
                'parentPhone' => $locked->parent_phone,
                'childName' => $student ? trim($student->first_name.' '.$student->last_name) : $locked->parent_name,
                'className' => $student?->orbund_class_id ?? '',
                'location' => $student?->location ?? '',
                'date' => $student?->class_date?->toDateString() ?? '',
                'time' => $student?->class_time ?? '',
            ];
            $target === 'confirmed'
                ? $this->notifications->enrollmentConfirmed($payload)
                : $this->notifications->enrollmentCancelled($payload);
            $this->notifications->fireEventWorkflows('enrollment_'.$target, $payload);

            if ($target === 'confirmed' && $locked->lead_id && ($lead = \App\Models\Lead::find($locked->lead_id))) {
                $this->leadLifecycle->transition($lead, 'trial_scheduled', null, 'Trial confirmed by parent', 'trial_confirmed');
            } elseif ($target === 'cancelled' && $locked->lead_id && ($lead = \App\Models\Lead::find($locked->lead_id))) {
                $this->leadLifecycle->transition($lead, 'post_registered', null, 'Trial cancelled by parent', 'trial_cancelled');
            }

            return ['status' => $target, 'changed' => true];
        });
    }
}
