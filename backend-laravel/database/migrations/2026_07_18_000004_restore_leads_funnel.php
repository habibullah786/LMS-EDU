<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('phone');
            $table->string('age_group')->nullable();
            $table->string('course')->nullable();
            $table->string('location')->nullable();
            $table->string('orbund_program_id')->nullable();
            $table->string('orbund_campus_type')->nullable();
            $table->string('level_id')->nullable();
            $table->string('semester_id')->nullable();
            $table->string('source');
            $table->string('page_url')->nullable();
            $table->string('orbund_session_id')->nullable();
            $table->boolean('is_registered')->default(false);
            $table->timestamp('registered_at')->nullable();
            $table->timestamps();
            $table->unique(['email', 'source']);
            $table->index(['is_registered', 'created_at']);
        });
    }

    public function down(): void { Schema::dropIfExists('leads'); }
};
