<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('custom_workflows', function (Blueprint $table) {
            $table->dateTime('scheduled_at')->nullable()->after('condition_course');
            $table->dateTime('scheduled_sent_at')->nullable()->after('scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::table('custom_workflows', function (Blueprint $table) {
            $table->dropColumn(['scheduled_at', 'scheduled_sent_at']);
        });
    }
};
