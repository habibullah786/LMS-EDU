<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('age_group'); // 7-8, 9-11, 12+
            $table->string('level')->nullable(); // beginner, intermediate, advanced
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_trial')->default(false);
            $table->integer('max_capacity')->default(6);
            $table->string('semester')->nullable(); // APR-JUN, JUL-SEP, OCT-DEC, JAN-MAR
            $table->timestamps();
            
            $table->index(['program_id', 'department_id']);
            $table->index(['age_group', 'is_trial']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
