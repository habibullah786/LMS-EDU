<?php

namespace App\Jobs;

use App\Models\Enrollment;
use App\Services\LeadLifecycleService;
use App\Services\OrbundSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncEnrollmentToOrbund implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public int $tries = 4;
    public array $backoff = [60, 300, 900];
    public function __construct(public int $enrollmentId) {}

    public function handle(OrbundSyncService $orbund, LeadLifecycleService $lifecycle): void
    {
        $enrollment = Enrollment::with(['students.student', 'lead'])->findOrFail($this->enrollmentId);
        if ($enrollment->orbund_sync_status === 'synced') return;
        $enrollment->update(['orbund_sync_status' => 'processing']);
        try {
            $result = $orbund->sync($enrollment);
            $enrollment->update(['orbund_sync_status' => 'synced', 'orbund_student_id' => $result['student_id'] ?? $result['id'] ?? null, 'orbund_sync_at' => now(), 'orbund_sync_error' => null]);
            if ($enrollment->lead) $lifecycle->transition($enrollment->lead, 'confirmed_on_orbund', null, 'Orbund sync completed', 'orbund_sync_succeeded');
        } catch (\Throwable $e) {
            $manual = str_contains($e->getMessage(), 'not configured');
            $enrollment->update(['orbund_sync_status' => $manual ? 'manual_required' : 'failed', 'orbund_sync_error' => $e->getMessage()]);
            if (!$manual) throw $e;
        }
    }
}

