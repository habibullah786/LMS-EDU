<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_final_trial_schema_has_no_obsolete_orbund_tables(): void
    {
        $this->assertTrue(Schema::hasTable('trial_enrollment_students'));
        $this->assertFalse(Schema::hasTable('orbund_classes'));
        $this->assertFalse(Schema::hasTable('orbund_enrollment_students'));
    }

    public function test_lead_pipeline_schema_is_available(): void
    {
        $this->assertTrue(Schema::hasTable('lead_activities'));
        $this->assertTrue(Schema::hasColumns('leads', [
            'status', 'is_spam', 'duplicate_of_lead_id', 'follow_up_at',
            'follow_up_required', 'data_confirmed_at', 'marketing_email_consent',
        ]));
        $this->assertTrue(Schema::hasColumns('lead_reminder_calls', ['outcome_code', 'notes']));
        $this->assertTrue(Schema::hasTable('lead_nurture_steps'));
        $this->assertTrue(Schema::hasTable('lead_messages'));
        $this->assertTrue(Schema::hasColumns('enrollments', ['school_class_id', 'enrollment_source', 'orbund_sync_status']));
        $this->assertTrue(Schema::hasColumns('trial_enrollment_students', ['school_class_id', 'enroll_decision', 'missed_reason_code']));
    }
}
