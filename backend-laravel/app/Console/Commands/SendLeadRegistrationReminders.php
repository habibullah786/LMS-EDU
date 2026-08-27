<?php

namespace App\Console\Commands;

use App\Jobs\SendEmailNotification;
use App\Models\Lead;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendLeadRegistrationReminders extends Command
{
    protected $signature = 'leads:send-registration-reminders {--dry-run : Show due reminders without sending}';
    protected $description = 'Email unregistered leads on days 1, 3, and 7';

    private const DAYS = [1, 3, 7];

    public function handle(): int
    {
        $due = Lead::where('is_registered', false)
            ->whereIn('status', ['lead_received', 'post_registered'])
            ->where('is_spam', false)
            ->whereNull('duplicate_of_lead_id')
            ->where('reminder_email_count', '<', count(self::DAYS))
            ->orderBy('id')->get();

        $sent = 0;
        foreach ($due as $lead) {
            $count = (int) $lead->reminder_email_count;
            $day = self::DAYS[$count];
            if ($lead->created_at->gt(now()->subDays($day))) continue;

            if ($this->option('dry-run')) {
                $this->line("[DRY RUN] Day {$day} reminder to {$lead->email}");
                continue;
            }

            DB::transaction(function () use ($lead, $count, $day) {
                $locked = Lead::whereKey($lead->id)->lockForUpdate()->first();
                if (!$locked || $locked->is_registered || $locked->is_spam || $locked->duplicate_of_lead_id || $locked->reminder_email_count !== $count) return;

                if ($locked->status === 'lead_received') {
                    $locked->update(['status' => 'post_registered']);
                    $locked->activities()->create([
                        'type' => 'status_changed',
                        'from_status' => 'lead_received',
                        'to_status' => 'post_registered',
                        'occurred_at' => now(),
                    ]);
                }

                DB::table('leads')->where('id', $locked->id)->update([
                    'reminder_email_count' => $count + 1,
                    'reminder_email_time' => now(),
                ]);
                $locked->reminderEmails()->create([
                    'reminder_day' => $day,
                    'sent_at' => now(),
                ]);

                $name = htmlspecialchars($locked->name, ENT_QUOTES, 'UTF-8');
                $course = htmlspecialchars($locked->course ?: 'Robotics or Coding', ENT_QUOTES, 'UTF-8');
                SendEmailNotification::dispatch(
                    $locked->email,
                    $locked->name,
                    "Reminder: Complete your Exceed Robotics registration",
                    "<html><body style='font-family:Arial,sans-serif;color:#374151'><h2>Hi {$name},</h2><p>You recently showed interest in a <strong>{$course}</strong> trial class.</p><p>Complete your registration to reserve a class for your child.</p><p><a href='https://exceedrobotics.com/trial' style='background:#1e3f8b;color:white;padding:12px 20px;text-decoration:none;border-radius:8px'>Complete Registration</a></p><p>If you have already registered, you can ignore this message.</p></body></html>",
                    "lead_registration_reminder_day_{$day}",
                );
            });
            $sent++;
        }

        $this->info("Queued {$sent} lead registration reminder(s).");
        return self::SUCCESS;
    }
}
