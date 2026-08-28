<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lead_reminder_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('called_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('called_at');
            $table->index(['lead_id', 'called_at']);
        });

        // Preserve the latest call recorded by the previous single-time design.
        DB::table('leads')->whereNotNull('reminder_call_time')->orderBy('id')->each(function ($lead) {
            DB::table('lead_reminder_calls')->insert([
                'lead_id' => $lead->id,
                'called_by' => null,
                'called_at' => $lead->reminder_call_time,
            ]);
        });
    }

    public function down(): void { Schema::dropIfExists('lead_reminder_calls'); }
};
