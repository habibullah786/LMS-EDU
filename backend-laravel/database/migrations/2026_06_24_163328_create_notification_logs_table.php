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
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['email', 'sms']);
            $table->string('event', 60)->index();
            $table->string('recipient', 255);
            $table->string('subject', 255)->nullable();
            $table->enum('status', ['sent', 'failed', 'skipped'])->index();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
