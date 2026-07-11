<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orbund_classes', function (Blueprint $table) {
            $table->id();
            $table->string('orbund_class_id')->unique();   // Orbund's classId — primary sync key
            $table->string('campus_type');                 // location code e.g. 1, 3, 6
            $table->string('level_id');                    // 4000281=Robotics, 4000282=Coding
            $table->string('program_id');                  // age-group program e.g. 4001270
            $table->string('semester_id');                 // semester e.g. 4000979
            $table->string('session')->nullable();         // e.g. "Session 1"
            $table->string('dates')->nullable();           // human-readable date range
            $table->string('time')->nullable();            // class time
            $table->integer('minimum_age')->nullable();
            $table->string('tuition')->nullable();         // price as returned by Orbund
            $table->boolean('allow_to_select')->default(true);
            $table->string('status_message')->nullable();
            $table->boolean('is_active')->default(true);  // false = no longer in Orbund
            $table->timestamp('synced_at')->nullable();    // last successful sync time
            $table->timestamps();

            $table->index('campus_type');
            $table->index('level_id');
            $table->index('program_id');
            $table->index('semester_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbund_classes');
    }
};
