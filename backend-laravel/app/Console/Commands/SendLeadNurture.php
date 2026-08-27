<?php

namespace App\Console\Commands;

use App\Jobs\SendEmailNotification;
use App\Jobs\SendSmsNotification;
use App\Models\LeadNurtureStep;
use Illuminate\Console\Command;

class SendLeadNurture extends Command
{
    protected $signature = 'leads:send-nurture {--dry-run}';
    protected $description = 'Send due consent-aware nurture steps to leads who did not enroll';
    public function handle(): int
    {
        $steps = LeadNurtureStep::with('lead')->where('status', 'scheduled')->where('scheduled_at', '<=', now())->orderBy('id')->get();
        $sent = 0;
        foreach ($steps as $step) {
            $lead = $step->lead;
            if (!$lead || $lead->status !== 'did_not_enroll' || $lead->is_spam || $lead->duplicate_of_lead_id) { $step->update(['status' => 'cancelled']); continue; }
            if ($this->option('dry-run')) { $this->line("Step {$step->step}: {$lead->email}"); continue; }
            $subject = ['A class your child may love', 'Ready when you are', 'See what Exceed Robotics students build'][$step->step - 1];
            if ($lead->marketing_email_consent) SendEmailNotification::dispatch($lead->email, $lead->name, $subject, "<p>Hi ".e($lead->name).",</p><p>Thank you for visiting Exceed Robotics. When the time is right, you can view current classes and choose the best fit for your child.</p><p><a href='https://exceedrobotics.com/trial'>View classes</a></p>", 'lead_nurture_step_'.$step->step);
            if ($lead->marketing_sms_consent) SendSmsNotification::dispatch($lead->phone, 'Exceed Robotics: View current coding and robotics classes at exceedrobotics.com/trial. Reply STOP to opt out.', 'lead_nurture_step_'.$step->step);
            $step->update(['status' => 'sent', 'sent_at' => now()]); $sent++;
        }
        $this->info("Queued {$sent} nurture step(s).");
        return self::SUCCESS;
    }
}

