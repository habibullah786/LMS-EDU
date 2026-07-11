<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orbund_enrollment_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
            $table->string('orbund_unique_id')->nullable();  // uniqueId from Orbund cartStudents
            $table->string('first_name');
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->string('orbund_class_id');               // Orbund classId
            $table->string('location')->nullable();          // Thornhill, Richmond Hill, Yonge & Lawrence
            $table->string('course')->nullable();            // Robotics, Coding, Game, AI
            $table->decimal('price', 10, 2)->nullable();
            $table->timestamps();

            $table->index('enrollment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orbund_enrollment_students');
    }
};
