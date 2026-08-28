<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('enrollments', 'lead_id')) {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete()->index();
            });
        }
        Schema::table('enrollments', function (Blueprint $table) {
            $table->foreignId('school_class_id')->nullable()->constrained('school_classes')->nullOnDelete();
            $table->string('term')->nullable();
            $table->string('enrollment_source', 30)->nullable();
            $table->timestamp('waiver_signed_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->string('orbund_student_id')->nullable();
            $table->string('orbund_sync_status', 30)->default('not_queued')->index();
            $table->timestamp('orbund_sync_at')->nullable();
            $table->text('orbund_sync_error')->nullable();
        });

        Schema::table('trial_enrollment_students', function (Blueprint $table) {
            $table->foreignId('school_class_id')->nullable()->constrained('school_classes')->nullOnDelete();
            $table->timestamp('attendance_marked_at')->nullable();
            $table->foreignId('attendance_marked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('missed_reason_code', 50)->nullable();
            $table->text('missed_reason_notes')->nullable();
            $table->string('enroll_decision', 20)->nullable();
            $table->timestamp('enroll_decision_at')->nullable();
            $table->foreignId('enroll_decision_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('not_enrolled_reason_code', 50)->nullable();
            $table->text('not_enrolled_notes')->nullable();
            $table->timestamp('reminder_invalidated_at')->nullable();
        });

        Schema::create('lead_nurture_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('step');
            $table->dateTime('scheduled_at')->index();
            $table->timestamp('sent_at')->nullable();
            $table->string('status', 20)->default('scheduled')->index();
            $table->text('error')->nullable();
            $table->timestamps();
            $table->unique(['lead_id', 'step']);
        });

        Schema::create('lead_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->string('direction', 10);
            $table->string('channel', 20)->default('sms');
            $table->string('from_address')->nullable();
            $table->string('to_address')->nullable();
            $table->text('body');
            $table->string('provider_message_id')->nullable()->unique();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();
            $table->index(['lead_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_messages');
        Schema::dropIfExists('lead_nurture_steps');
        Schema::table('trial_enrollment_students', function (Blueprint $table) {
            $table->dropForeign(['school_class_id']);
            $table->dropForeign(['attendance_marked_by']);
            $table->dropForeign(['enroll_decision_by']);
            $table->dropColumn(['school_class_id', 'attendance_marked_at', 'attendance_marked_by', 'missed_reason_code', 'missed_reason_notes', 'enroll_decision', 'enroll_decision_at', 'enroll_decision_by', 'not_enrolled_reason_code', 'not_enrolled_notes', 'reminder_invalidated_at']);
        });
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropForeign(['school_class_id']);
            $table->dropColumn(['school_class_id', 'term', 'enrollment_source', 'waiver_signed_at', 'activated_at', 'orbund_student_id', 'orbund_sync_status', 'orbund_sync_at', 'orbund_sync_error']);
        });
    }
};
