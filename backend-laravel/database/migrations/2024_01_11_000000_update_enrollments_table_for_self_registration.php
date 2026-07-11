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
        Schema::table('enrollments', function (Blueprint $table) {
            // Add new columns if they don't exist
            if (!Schema::hasColumn('enrollments', 'registration_type')) {
                $table->enum('registration_type', ['individual', 'group', 'batch'])->default('individual')->after('status');
            }
            if (!Schema::hasColumn('enrollments', 'is_paid')) {
                $table->boolean('is_paid')->default(false)->after('registration_type');
            }
            if (!Schema::hasColumn('enrollments', 'enrollment_date')) {
                $table->timestamp('enrollment_date')->nullable()->after('is_paid');
            }
            if (!Schema::hasColumn('enrollments', 'group_reference_id')) {
                $table->string('group_reference_id')->nullable()->index()->after('enrollment_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollments', function (Blueprint $table) {
            if (Schema::hasColumn('enrollments', 'registration_type')) {
                $table->dropColumn('registration_type');
            }
            if (Schema::hasColumn('enrollments', 'is_paid')) {
                $table->dropColumn('is_paid');
            }
            if (Schema::hasColumn('enrollments', 'enrollment_date')) {
                $table->dropColumn('enrollment_date');
            }
            if (Schema::hasColumn('enrollments', 'group_reference_id')) {
                $table->dropColumn('group_reference_id');
            }
        });
    }
};
