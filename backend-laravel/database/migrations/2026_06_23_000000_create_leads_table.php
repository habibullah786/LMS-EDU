<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone');
            $table->string('age_group')->nullable();        // e.g. "7 Years Old"
            $table->string('orbund_program_id')->nullable(); // Orbund programId e.g. 4001270
            $table->string('location')->nullable();          // e.g. "Thornhill"
            $table->string('orbund_campus_type')->nullable(); // Orbund campusType e.g. 1, 3, 6
            $table->string('level_id')->nullable();           // Orbund levelId e.g. 4000281
            $table->string('semester_id')->nullable();        // Orbund semesterId e.g. 4000979
            $table->string('source')->nullable();             // robotics_trial, coding_trial, etc.
            $table->string('page_url')->nullable();           // controls thank-you routing
            $table->string('orbund_session_id')->nullable();
            $table->enum('status', ['new', 'contacted', 'enrolled', 'lost'])->default('new');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('email');
            $table->index('status');
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
