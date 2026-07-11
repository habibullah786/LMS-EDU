<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('parent_name');
            $table->string('parent_email');
            $table->string('parent_phone');
            $table->decimal('total_amount', 10, 2);
            $table->enum('status', ['confirmed', 'pending', 'cancelled'])->default('pending');
            $table->dateTime('booking_date');
            $table->timestamps();
            
            // Indexes
            $table->index('user_id');
            $table->index('status');
            $table->index('booking_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
