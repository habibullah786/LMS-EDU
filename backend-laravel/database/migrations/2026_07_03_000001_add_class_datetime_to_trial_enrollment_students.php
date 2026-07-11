<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('trial_enrollment_students', function (Blueprint $table) {
            $table->date('class_date')->nullable()->after('orbund_class_id');
            $table->string('class_time')->nullable()->after('class_date');
        });
    }

    public function down(): void
    {
        Schema::table('trial_enrollment_students', function (Blueprint $table) {
            $table->dropColumn(['class_date', 'class_time']);
        });
    }
};
