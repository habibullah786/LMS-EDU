<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trial_enrollment_student_id')->constrained('trial_enrollment_students')->onDelete('cascade');
            $table->string('certificate_number')->unique();
            $table->string('student_name');
            $table->string('course')->nullable();
            $table->string('location')->nullable();
            $table->date('issued_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
