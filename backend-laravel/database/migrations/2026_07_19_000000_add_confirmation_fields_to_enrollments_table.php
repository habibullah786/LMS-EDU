<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->string('confirmation_token_hash', 64)->nullable()->unique();
            $table->timestamp('confirmation_token_expires_at')->nullable();
            $table->timestamp('confirmation_request_sent_at')->nullable();
            $table->timestamp('confirmation_responded_at')->nullable();
            $table->string('confirmation_response_channel', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropUnique(['confirmation_token_hash']);
            $table->dropColumn(['confirmation_token_hash', 'confirmation_token_expires_at', 'confirmation_request_sent_at', 'confirmation_responded_at', 'confirmation_response_channel']);
        });
    }
};
