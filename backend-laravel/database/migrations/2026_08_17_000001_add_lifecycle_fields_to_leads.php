<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('status', 50)->default('lead_received')->index();
            $table->string('postal_code', 20)->nullable();
            $table->timestamp('preferred_call_at')->nullable();
            $table->unsignedInteger('children_count')->nullable();
            $table->unsignedInteger('course_interest_count')->nullable();
            $table->boolean('marketing_email_consent')->default(false);
            $table->boolean('marketing_sms_consent')->default(false);
            $table->timestamp('marketing_consent_at')->nullable();
            $table->boolean('is_spam')->default(false)->index();
            $table->text('spam_reason')->nullable();
            $table->foreignId('duplicate_of_lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->timestamp('data_confirmed_at')->nullable();
            $table->foreignId('data_confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('follow_up_at')->nullable()->index();
            $table->boolean('follow_up_required')->default(false)->index();
        });

        DB::table('leads')->update([
            'status' => DB::raw("CASE WHEN is_registered = 1 THEN 'pre_registered' ELSE 'post_registered' END"),
        ]);

        Schema::table('lead_reminder_calls', function (Blueprint $table) {
            $table->string('outcome_code', 50)->nullable();
            $table->text('notes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lead_reminder_calls', function (Blueprint $table) {
            $table->dropColumn(['outcome_code', 'notes']);
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['duplicate_of_lead_id']);
            $table->dropForeign(['data_confirmed_by']);
            $table->dropColumn([
                'status', 'postal_code', 'preferred_call_at', 'children_count',
                'course_interest_count', 'marketing_email_consent', 'marketing_sms_consent',
                'marketing_consent_at', 'is_spam', 'spam_reason', 'duplicate_of_lead_id',
                'data_confirmed_at', 'data_confirmed_by', 'follow_up_at', 'follow_up_required',
            ]);
        });
    }
};

