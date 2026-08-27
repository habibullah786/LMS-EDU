<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeadLifecycleService
{
    public const STATUSES = [
        'lead_received', 'post_registered', 'pre_registered', 'trial_scheduled',
        'attended_trial', 'missed_trial', 'decides_to_enroll', 'did_not_enroll',
        'enrolled_term_1', 'confirmed_on_orbund', 'dropped_spam', 'duplicate',
    ];

    public function transition(Lead $lead, string $status, ?User $actor = null, ?string $reason = null, string $type = 'status_changed'): Lead
    {
        if (!in_array($status, self::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => 'Unknown lead status.']);
        }
        if ($lead->status === $status) return $lead;

        return DB::transaction(function () use ($lead, $status, $actor, $reason, $type) {
            $locked = Lead::whereKey($lead->id)->lockForUpdate()->firstOrFail();
            $previous = $locked->status;
            $locked->update(['status' => $status]);
            $locked->activities()->create([
                'actor_id' => $actor?->id,
                'type' => $type,
                'from_status' => $previous,
                'to_status' => $status,
                'notes' => $reason,
                'occurred_at' => now(),
            ]);
            return $locked->fresh();
        });
    }

    public function record(Lead $lead, string $type, ?User $actor = null, ?string $notes = null, ?string $outcome = null, array $metadata = []): void
    {
        $lead->activities()->create([
            'actor_id' => $actor?->id,
            'type' => $type,
            'outcome_code' => $outcome,
            'notes' => $notes,
            'metadata' => $metadata ?: null,
            'occurred_at' => now(),
        ]);
    }
}

