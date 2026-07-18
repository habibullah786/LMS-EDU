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
}
