<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('enrollment_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('class_id');
            $table->string('class_name');
            $table->enum('course', ['Coding', 'Robotics']);
            $table->enum('location', ['Delhi', 'Bengaluru', 'Kolkata']);
            $table->string('instructor');
            $table->decimal('price', 10, 2);
            $table->enum('type', ['Trial', 'Paid'])->default('Trial');
            $table->timestamps();
            
            // Unique constraint preventing duplicate enrollments
            $table->unique(['enrollment_id', 'student_id', 'class_id']);
            
            // Indexes
            $table->index('enrollment_id');
            $table->index('student_id');
            $table->index(['location', 'course']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_students');
    }
};
