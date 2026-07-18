<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Widen enrollments.status beyond the original ['confirmed', 'pending', 'cancelled']
     * CHECK constraint. RegistrationController and CheckoutController both write
     * 'active' / 'pending_payment', values the original constraint rejects on any
     * driver that enforces it — silently breaking enrollment creation.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check');
            DB::statement('ALTER TABLE enrollments ALTER COLUMN status TYPE VARCHAR(255)');

            return;
        }

        // SQLite has no ALTER TABLE ... DROP CONSTRAINT; rebuild the table instead.
        Schema::create('enrollments_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('parent_name');
            $table->string('parent_email');
            $table->string('parent_phone');
            $table->decimal('total_amount', 10, 2);
            $table->string('status')->default('pending');
            $table->dateTime('booking_date');
            $table->timestamps();
            $table->enum('registration_type', ['individual', 'group', 'batch'])->default('individual');
            $table->boolean('is_paid')->default(false);
            $table->timestamp('enrollment_date')->nullable();
            $table->string('group_reference_id')->nullable();
            $table->string('source')->nullable();
            $table->unsignedBigInteger('lead_id')->nullable();
            $table->string('trial_ref_id')->nullable();

            $table->index('user_id');
            $table->index('status');
            $table->index('booking_date');
            $table->index('group_reference_id');
            $table->index('lead_id');
        });

        DB::statement('
            INSERT INTO enrollments_new (id, user_id, parent_name, parent_email, parent_phone, total_amount, status, booking_date, created_at, updated_at, registration_type, is_paid, enrollment_date, group_reference_id, source, lead_id, trial_ref_id)
            SELECT id, user_id, parent_name, parent_email, parent_phone, total_amount, status, booking_date, created_at, updated_at, registration_type, is_paid, enrollment_date, group_reference_id, source, lead_id, trial_ref_id
            FROM enrollments
        ');

        Schema::drop('enrollments');
        Schema::rename('enrollments_new', 'enrollments');
    }

    /**
     * Reverse the migrations.
     *
     * Not reversible without risking truncation of any row already using a
     * widened status value, so this is intentionally a no-op.
     */
    public function down(): void
    {
    }
};
