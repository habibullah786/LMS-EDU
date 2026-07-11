<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            if (!Schema::hasColumn('enrollments', 'orbund_enrollment_id')) {
                $table->string('orbund_enrollment_id')->nullable()->after('group_reference_id');
            }
            if (!Schema::hasColumn('enrollments', 'source')) {
                $table->string('source')->nullable()->after('orbund_enrollment_id');
            }
            if (!Schema::hasColumn('enrollments', 'lead_id')) {
                $table->unsignedBigInteger('lead_id')->nullable()->after('source');
                $table->index('lead_id');
            }
            if (!Schema::hasColumn('enrollments', 'orbund_enrollment_id')) {
                $table->index('orbund_enrollment_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'lead_id')) {
                $table->dropIndex(['lead_id']);
                $table->dropColumn('lead_id');
            }
            if (Schema::hasColumn('enrollments', 'source')) {
                $table->dropColumn('source');
            }
            if (Schema::hasColumn('enrollments', 'orbund_enrollment_id')) {
                $table->dropColumn('orbund_enrollment_id');
            }
        });
    }
};
