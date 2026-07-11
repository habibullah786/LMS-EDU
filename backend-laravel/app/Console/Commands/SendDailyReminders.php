<?php

namespace App\Console\Commands;

use App\Models\TrialEnrollmentStudent;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendDailyReminders extends Command
{
    protected $signature   = 'notifications:send-reminders {--dry-run : Log what would be sent without dispatching}';
    protected $description = 'Send 24-hour class reminder notifications to parents of confirmed trial enrollments';

    public function handle(NotificationService $notifications): int
    {
        $dryRun   = $this->option('dry-run');
        $tomorrow = now()->addDay()->toDateString();

        // Find confirmed trial students whose class is tomorrow
        $students = TrialEnrollmentStudent::whereDate('class_date', $tomorrow)
            ->whereHas('enrollment', fn($q) => $q->where('status', 'confirmed'))
            ->with('enrollment')
            ->get();

        if ($students->isEmpty()) {
            $this->info("No confirmed trial classes found for {$tomorrow}.");
            return Command::SUCCESS;
        }

        $this->info("Found {$students->count()} student(s) with classes on {$tomorrow}.");

        foreach ($students as $student) {
            $enrollment = $student->enrollment;

            $data = [
                'parentName'  => $enrollment->parent_name,
                'parentEmail' => $enrollment->parent_email,
                'parentPhone' => $enrollment->parent_phone,
                'childName'   => trim($student->first_name . ' ' . $student->last_name),
                'className'   => $student->orbund_class_id,
                'location'    => $student->location ?? '',
                'time'        => $student->class_time ?? '',
            ];

            if ($dryRun) {
                $this->line("  [DRY RUN] Would remind {$data['parentEmail']} — {$data['childName']} — {$data['className']} at {$data['time']}");
                continue;
            }

            $notifications->classReminder($data);
            $this->line("  Reminder sent to: {$data['parentEmail']} for {$data['childName']}");
        }

        $this->info('Done.');
        return Command::SUCCESS;
    }
}
