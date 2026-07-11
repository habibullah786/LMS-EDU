<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('trial_enrollment_students', function (Blueprint $table) {
            // null = not marked yet, true = attended, false = no-show
            $table->boolean('attended')->nullable()->default(null)->after('class_time');
        });
    }

    public function down(): void
    {
        Schema::table('trial_enrollment_students', function (Blueprint $table) {
            $table->dropColumn('attended');
        });
    }
};
