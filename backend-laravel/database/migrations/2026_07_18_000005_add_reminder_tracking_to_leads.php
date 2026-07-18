<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedTinyInteger('reminder_email_sent_count')->default(0);
            $table->timestamp('last_reminder_email_sent_at')->nullable();
            $table->index(['is_registered', 'reminder_email_sent_count', 'created_at'], 'leads_reminder_due_index');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('leads_reminder_due_index');
            $table->dropColumn(['reminder_email_sent_count', 'last_reminder_email_sent_at']);
        });
    }
};
