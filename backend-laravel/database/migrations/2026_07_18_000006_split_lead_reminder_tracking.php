<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->renameColumn('reminder_email_sent_count', 'reminder_email_count');
            $table->renameColumn('last_reminder_email_sent_at', 'reminder_email_time');
        });
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedInteger('reminder_call_count')->default(0);
            $table->timestamp('reminder_call_time')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['reminder_call_count', 'reminder_call_time']);
            $table->renameColumn('reminder_email_count', 'reminder_email_sent_count');
            $table->renameColumn('reminder_email_time', 'last_reminder_email_sent_at');
        });
    }
};
