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
        Schema::create('custom_workflows', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->enum('trigger_type', ['manual', 'event'])->default('manual');
            $table->string('event_key', 80)->nullable()->index();
            $table->boolean('email_enabled')->default(true);
            $table->enum('email_recipient', ['parent', 'admin', 'both'])->default('parent');
            $table->string('email_subject')->nullable();
            $table->text('email_body')->nullable();
            $table->boolean('sms_enabled')->default(false);
            $table->enum('sms_recipient', ['parent', 'admin'])->default('parent');
            $table->text('sms_body')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_workflows');
    }
};
