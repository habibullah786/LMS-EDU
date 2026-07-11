<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Rename orbund_enrollment_students → trial_enrollment_students (create fresh if source is missing)
        if (Schema::hasTable('orbund_enrollment_students')) {
            Schema::rename('orbund_enrollment_students', 'trial_enrollment_students');
        } elseif (!Schema::hasTable('trial_enrollment_students')) {
            Schema::create('trial_enrollment_students', function (Blueprint $table) {
                $table->id();
                $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
                $table->string('orbund_unique_id')->nullable();
                $table->string('first_name');
                $table->string('last_name');
                $table->date('date_of_birth')->nullable();
                $table->string('orbund_class_id');
                $table->string('location')->nullable();
                $table->string('course')->nullable();
                $table->decimal('price', 10, 2)->nullable();
                $table->timestamps();
                $table->index('enrollment_id');
            });
        }

        // Rename orbund_enrollment_id → trial_ref_id on the enrollments table (idempotent).
        if (!Schema::hasColumn('enrollments', 'trial_ref_id')) {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->string('trial_ref_id')->nullable();
            });
        }
        if (Schema::hasColumn('enrollments', 'orbund_enrollment_id')) {
            DB::statement("UPDATE enrollments SET trial_ref_id = orbund_enrollment_id WHERE orbund_enrollment_id IS NOT NULL");
            Schema::table('enrollments', function (Blueprint $table) {
                try { $table->dropIndex('enrollments_orbund_enrollment_id_index'); } catch (\Throwable $e) {}
                $table->dropColumn('orbund_enrollment_id');
            });
        }
    }

    public function down(): void
    {
        Schema::rename('trial_enrollment_students', 'orbund_enrollment_students');

        Schema::table('enrollments', function (Blueprint $table) {
            $table->string('orbund_enrollment_id')->nullable();
        });
        DB::statement("UPDATE enrollments SET orbund_enrollment_id = trial_ref_id WHERE trial_ref_id IS NOT NULL");
        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn('trial_ref_id');
        });
    }
};
