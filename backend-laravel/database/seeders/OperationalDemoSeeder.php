<?php

namespace Database\Seeders;

use App\Models\CustomWorkflow;
use App\Models\Lead;
use App\Models\NotificationLog;
use Illuminate\Database\Seeder;

class OperationalDemoSeeder extends Seeder
{
    public function run(): void
    {
        Lead::updateOrCreate(
            ['email' => 'trial.lead@example.com', 'source' => 'trial_form'],
            ['name' => 'Demo Trial Lead', 'phone' => '+1 416 555 0101', 'age_group' => '7 Years Old', 'course' => 'Robotics', 'location' => 'Richmond Hill', 'is_registered' => false]
        );
        Lead::updateOrCreate(
            ['email' => 'registered.parent@example.com', 'source' => 'trial_form'],
            ['name' => 'Registered Demo Parent', 'phone' => '+1 416 555 0102', 'age_group' => '9–11 Years Old', 'course' => 'Robotics', 'location' => 'Thornhill', 'is_registered' => true, 'registered_at' => now()]
        );

        CustomWorkflow::updateOrCreate(
            ['name' => 'Demo Parent Follow-up'],
            ['description' => 'Example custom follow-up workflow', 'trigger_type' => 'manual', 'email_enabled' => true, 'email_recipient' => 'parent', 'email_subject' => 'Following up on your trial class', 'email_body' => 'Contact us if you need help with your trial booking.', 'sms_enabled' => false, 'active' => true]
        );

        foreach ([
            ['type' => 'email', 'event' => 'enrollment_created', 'recipient' => 'parent@example.com', 'subject' => 'Trial booking received', 'status' => 'sent'],
            ['type' => 'sms', 'event' => 'trial_confirmation_request', 'recipient' => '+1 416 555 0101', 'subject' => null, 'status' => 'skipped'],
            ['type' => 'email', 'event' => 'lead_registration_reminder', 'recipient' => 'trial.lead@example.com', 'subject' => 'Complete your registration', 'status' => 'sent'],
        ] as $log) {
            NotificationLog::firstOrCreate([
                'type' => $log['type'], 'event' => $log['event'], 'recipient' => $log['recipient'],
            ], $log);
        }
    }
}
