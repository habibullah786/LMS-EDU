<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_class_waitlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_class_id')->constrained('school_classes')->onDelete('cascade');
            $table->string('parent_name');
            $table->string('parent_email');
            $table->string('parent_phone')->nullable();
            $table->string('student_name');
            $table->date('date_of_birth')->nullable();
            $table->integer('position')->default(0);
            $table->enum('status', ['waiting', 'approved', 'rejected'])->default('waiting');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['school_class_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_class_waitlists');
    }
};
