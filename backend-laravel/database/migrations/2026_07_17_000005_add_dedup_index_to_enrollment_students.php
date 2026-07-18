<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A student may not enroll in the same class twice. The equivalent unique
     * constraint on (enrollment_id, student_id, class_id) was dropped in
     * 2026_06_23_000002_update_enrollment_students_for_orbund to support
     * Orbund-sourced rows with a null student_id — this re-adds an
     * equivalent guard scoped to only the rows that actually identify a
     * student, via a partial unique index.
     */
    public function up(): void
    {
        DB::statement(
            'CREATE UNIQUE INDEX idx_enrollment_students_no_dup ON enrollment_students (student_id, class_id) WHERE student_id IS NOT NULL'
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_enrollment_students_no_dup');
    }
};
