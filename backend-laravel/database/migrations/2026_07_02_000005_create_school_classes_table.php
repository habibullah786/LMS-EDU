<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('school_classes', function (Blueprint $table) {
            $table->id();
            $table->string('curriculum');
            $table->json('locations');
            $table->json('age_groups');
            $table->string('course');
            $table->enum('type', ['Trial', 'Paid'])->default('Trial');
            $table->string('semester')->default('4000979');
            $table->decimal('price', 10, 2)->default(0);
            $table->date('date')->nullable();
            $table->string('time')->nullable();
            $table->integer('available_slots')->default(6);
            $table->string('instructor');
            $table->integer('max_students')->default(6);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_classes');
    }
};
