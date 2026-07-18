<?php

namespace App\Console\Commands;

use App\Models\TrialEnrollmentStudent;
use App\Services\NotificationService;
use App\Services\TrialConfirmationService;
use Illuminate\Console\Command;

class SendDailyReminders extends Command
{
    protected $signature   = 'notifications:send-reminders {--dry-run : Log what would be sent without dispatching}';
    protected $description = 'Ask parents to confirm or cancel pending trial enrollments 24 hours before class';

    public function handle(NotificationService $notifications, TrialConfirmationService $confirmations): int
    {
        $dryRun   = $this->option('dry-run');
        $tomorrow = now()->addDay()->toDateString();

        $students = TrialEnrollmentStudent::whereDate('class_date', $tomorrow)
            ->whereHas('enrollment', fn($q) => $q->where('status', 'pending')->whereNull('confirmation_request_sent_at'))
            ->with('enrollment')
            ->get()->unique('enrollment_id');

        if ($students->isEmpty()) {
            $this->info("No pending trial confirmations found for {$tomorrow}.");
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
                'date'        => $student->class_date?->toDateString() ?? $tomorrow,
            ];

            if ($dryRun) {
                $this->line("  [DRY RUN] Would remind {$data['parentEmail']} — {$data['childName']} — {$data['className']} at {$data['time']}");
                continue;
            }

            $token = $confirmations->issueToken($enrollment);
            $base = rtrim(config('services.frontend_url'), '/').'/trial/confirmation?token='.urlencode($token);
            $data['confirmUrl'] = $base.'&action=confirm&channel=email_link';
            $data['cancelUrl'] = $base.'&action=cancel&channel=email_link';
            $data['smsUrl'] = $base.'&channel=sms_link';
            $enrollment->update(['confirmation_request_sent_at' => now()]);
            $notifications->trialConfirmationRequest($data);
            $this->line("  Confirmation request sent to: {$data['parentEmail']} for {$data['childName']}");
        }

        $this->info('Done.');
        return Command::SUCCESS;
    }
}
