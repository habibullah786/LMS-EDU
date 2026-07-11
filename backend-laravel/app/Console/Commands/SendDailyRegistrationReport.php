<?php

namespace App\Console\Commands;

use App\Models\Enrollment;
use App\Models\Lead;
use App\Models\SchoolClassWaitlist;
use App\Models\TrialEnrollmentStudent;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendDailyRegistrationReport extends Command
{
    protected $signature   = 'notifications:daily-registration-report {--dry-run : Log the report without emailing it}';
    protected $description = 'Email the admin a summary of registrations, leads, and waitlist activity from the last 24 hours';

    public function handle(NotificationService $notifications): int
    {
        $since = now()->subDay();

        $newEnrollments = Enrollment::where('created_at', '>=', $since)->get();
        $newStudents    = TrialEnrollmentStudent::where('created_at', '>=', $since)->count();
        $newLeads       = Lead::where('created_at', '>=', $since)->count();
        $waitlistJoins  = SchoolClassWaitlist::where('created_at', '>=', $since)->count();
        $revenue        = $newEnrollments->where('is_paid', true)->sum('total_amount');

        $data = [
            'date'           => now()->toDateString(),
            'newEnrollments' => $newEnrollments->count(),
            'newStudents'    => $newStudents,
            'newLeads'       => $newLeads,
            'waitlistJoins'  => $waitlistJoins,
            'revenue'        => number_format((float) $revenue, 2),
        ];

        if ($this->option('dry-run')) {
            $this->info('[DRY RUN] Daily report: ' . json_encode($data));
            return Command::SUCCESS;
        }

        $notifications->dailyRegistrationReport($data);
        $this->info('Daily registration report sent: ' . json_encode($data));

        return Command::SUCCESS;
    }
}
