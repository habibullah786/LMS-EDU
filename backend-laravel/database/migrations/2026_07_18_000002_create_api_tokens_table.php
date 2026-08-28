<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name')->default('web');
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            // DATETIME avoids legacy MariaDB implicit TIMESTAMP defaults while
            // preserving the same Laravel datetime semantics.
            $table->dateTime('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_tokens');
    }
};
