<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\Lead;
use App\Models\User;
use App\Models\SchoolClass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LeadPipelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_capture_creates_one_audited_lead_and_is_idempotent(): void
    {
        Queue::fake();
        $payload = [
            'name' => 'Jane Parent', 'email' => 'Jane@Example.com', 'phone' => '+1 416 555 0100',
            'course' => 'Robotics', 'location' => 'Thornhill', 'source' => 'trial',
            'children_count' => 1, 'marketing_email_consent' => true,
        ];

        $this->postJson('/api/leads', $payload)->assertCreated()->assertJsonPath('status', 'lead_received');
        $this->postJson('/api/leads', $payload)->assertCreated();

        $this->assertDatabaseCount('leads', 1);
        $this->assertDatabaseHas('leads', ['email' => 'jane@example.com', 'status' => 'lead_received']);
        $this->assertDatabaseCount('lead_activities', 1);
    }

    public function test_admin_can_add_note_schedule_follow_up_and_override_status(): void
    {
        Queue::fake();
        [$admin, $token] = $this->adminToken();
        $lead = Lead::create([
            'name' => 'Parent', 'email' => 'parent@example.com', 'phone' => '+14165550101',
            'source' => 'phone', 'status' => 'post_registered',
        ]);

        $headers = ['Authorization' => "Bearer {$token}"];
        $this->postJson("/api/admin/leads/{$lead->id}/actions", ['action' => 'add_note', 'notes' => 'Requested Saturday'], $headers)->assertOk();
        $this->postJson("/api/admin/leads/{$lead->id}/actions", ['action' => 'set_follow_up', 'follow_up_at' => now()->addDay()->toIso8601String()], $headers)->assertOk();
        $this->postJson("/api/admin/leads/{$lead->id}/actions", ['action' => 'override_status', 'status' => 'pre_registered', 'reason' => 'Trial booked by phone'], $headers)->assertOk();

        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'status' => 'pre_registered', 'follow_up_required' => true]);
        $this->assertDatabaseHas('lead_activities', ['lead_id' => $lead->id, 'type' => 'note', 'actor_id' => $admin->id]);
        $this->assertDatabaseHas('lead_activities', ['lead_id' => $lead->id, 'type' => 'manual_status_override', 'to_status' => 'pre_registered']);
    }

    public function test_spam_and_duplicate_leads_are_removed_from_reminder_eligibility(): void
    {
        Queue::fake();
        [, $token] = $this->adminToken();
        $original = Lead::create(['name' => 'Original', 'email' => 'original@example.com', 'phone' => '1', 'source' => 'phone', 'status' => 'post_registered']);
        $spam = Lead::create(['name' => 'Spam', 'email' => 'spam@example.com', 'phone' => '2', 'source' => 'web', 'status' => 'post_registered']);
        $duplicate = Lead::create(['name' => 'Duplicate', 'email' => 'dupe@example.com', 'phone' => '3', 'source' => 'web', 'status' => 'post_registered']);
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson("/api/admin/leads/{$spam->id}/actions", ['action' => 'mark_spam', 'reason' => 'Bot'], $headers)->assertOk();
        $this->postJson("/api/admin/leads/{$duplicate->id}/actions", ['action' => 'mark_duplicate', 'duplicate_of_lead_id' => $original->id], $headers)->assertOk();

        $this->assertDatabaseHas('leads', ['id' => $spam->id, 'status' => 'dropped_spam', 'is_spam' => true]);
        $this->assertDatabaseHas('leads', ['id' => $duplicate->id, 'status' => 'duplicate', 'duplicate_of_lead_id' => $original->id]);
    }

    public function test_admin_can_book_trial_record_no_decision_and_start_consent_aware_nurture(): void
    {
        Queue::fake(); [, $token] = $this->adminToken();
        $lead = Lead::create(['name' => 'Parent', 'email' => 'flow@example.com', 'phone' => '+14165550110', 'source' => 'phone', 'status' => 'post_registered', 'marketing_email_consent' => true]);
        $class = $this->schoolClass('Trial', 0);
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson("/api/admin/leads/{$lead->id}/book-trial", ['school_class_id' => $class->id, 'first_name' => 'Child', 'last_name' => 'One', 'booked_by' => 'phone'], $headers)->assertCreated();
        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'status' => 'pre_registered']);
        $this->assertDatabaseHas('school_classes', ['id' => $class->id, 'available_slots' => 5]);

        $this->postJson("/api/admin/leads/{$lead->id}/decision", ['decision' => 'no', 'reason_code' => 'price', 'notes' => 'Follow up later'], $headers)->assertOk();
        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'status' => 'did_not_enroll']);
        $this->assertDatabaseCount('lead_nurture_steps', 3);
    }

    public function test_admin_can_create_paid_front_desk_enrollment_and_queue_orbund_sync(): void
    {
        Queue::fake(); [, $token] = $this->adminToken();
        $lead = Lead::create(['name' => 'Parent', 'email' => 'paid@example.com', 'phone' => '+14165550111', 'source' => 'walk_in', 'status' => 'decides_to_enroll']);
        $class = $this->schoolClass('Paid', 299);
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->postJson("/api/admin/leads/{$lead->id}/enroll", ['source' => 'front_desk', 'school_class_id' => $class->id, 'amount' => 299, 'payment_status' => 'paid', 'payment_method' => 'terminal', 'transaction_id' => 'POS-1', 'waiver_signed' => true, 'first_name' => 'Paid', 'last_name' => 'Student', 'date_of_birth' => '2015-01-01'], $headers)
            ->assertCreated()->assertJsonPath('enrollment.orbund_sync_status', 'queued');
        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'status' => 'enrolled_term_1']);
        $this->assertDatabaseHas('payments', ['transaction_id' => 'POS-1', 'status' => 'completed']);
        $this->assertDatabaseHas('school_classes', ['id' => $class->id, 'available_slots' => 5]);
    }

    private function adminToken(): array
    {
        $admin = User::create([
            'name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'Password123!',
            'role' => 'admin', 'access_level' => 'super_admin', 'permissions' => [],
        ]);
        $plain = 'test-token-'.bin2hex(random_bytes(8));
        ApiToken::create(['user_id' => $admin->id, 'name' => 'test', 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addHour()]);
        return [$admin, $plain];
    }

    private function schoolClass(string $type, float $price): SchoolClass
    {
        return SchoolClass::create(['curriculum' => "{$type} Class", 'locations' => ['Thornhill'], 'age_groups' => ['9-11'], 'course' => 'Robotics', 'type' => $type, 'semester' => 'Term 1', 'price' => $price, 'date' => now()->addWeek()->toDateString(), 'time' => '10:00 AM', 'available_slots' => 6, 'instructor' => 'Instructor', 'max_students' => 6]);
    }
}
