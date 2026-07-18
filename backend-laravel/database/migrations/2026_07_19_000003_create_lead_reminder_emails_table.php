<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lead_reminder_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('reminder_day');
            $table->timestamp('sent_at');
            $table->unique(['lead_id', 'reminder_day']);
            $table->index(['lead_id', 'sent_at']);
        });

        // Preserve the latest timestamp from the previous single-time field.
        DB::table('leads')->whereNotNull('reminder_email_time')->orderBy('id')->each(function ($lead) {
            $days = [1, 3, 7];
            $index = max(0, min(((int) $lead->reminder_email_count) - 1, 2));
            DB::table('lead_reminder_emails')->insert([
                'lead_id' => $lead->id,
                'reminder_day' => $days[$index],
                'sent_at' => $lead->reminder_email_time,
            ]);
        });
    }

    public function down(): void { Schema::dropIfExists('lead_reminder_emails'); }
};
