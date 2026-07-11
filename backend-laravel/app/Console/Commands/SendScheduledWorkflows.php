<?php

namespace App\Console\Commands;

use App\Models\CustomWorkflow;
use App\Models\Enrollment;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendScheduledWorkflows extends Command
{
    protected $signature   = 'notifications:send-scheduled {--dry-run : Log without dispatching}';
    protected $description = 'Fire any custom workflows whose scheduled_at time has arrived';

    public function handle(NotificationService $notifications): int
    {
        $dryRun = $this->option('dry-run');

        $workflows = CustomWorkflow::where('active', true)
            ->whereNotNull('scheduled_at')
            ->whereNull('scheduled_sent_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        if ($workflows->isEmpty()) {
            $this->info('No scheduled workflows due.');
            return Command::SUCCESS;
        }

        $this->info("Found {$workflows->count()} workflow(s) due.");

        foreach ($workflows as $workflow) {
            $query = Enrollment::where('status', 'confirmed');

            if ($workflow->condition_location) {
                $query->whereHas('trialStudents', fn($q) =>
                    $q->where('location', $workflow->condition_location)
                );
            }

            if ($workflow->condition_course) {
                $query->whereHas('trialStudents', fn($q) =>
                    $q->where('course', $workflow->condition_course)
                );
            }

            $enrollments = $query->select('parent_name', 'parent_email', 'parent_phone')
                ->distinct()
                ->get();

            if ($dryRun) {
                $this->line("  [DRY RUN] \"{$workflow->name}\" → {$enrollments->count()} recipient(s)");
                continue;
            }

            $count = 0;
            foreach ($enrollments as $enrollment) {
                $notifications->fireCustomWorkflow($workflow, [
                    'parentName'  => $enrollment->parent_name,
                    'parentEmail' => $enrollment->parent_email,
                    'parentPhone' => $enrollment->parent_phone,
                ]);
                $count++;
            }

            $workflow->update(['scheduled_sent_at' => now()]);
            $this->line("  \"{$workflow->name}\" sent to {$count} parent(s).");
        }

        $this->info('Done.');
        return Command::SUCCESS;
    }
}
