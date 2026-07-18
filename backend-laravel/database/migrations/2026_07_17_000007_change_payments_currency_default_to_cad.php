<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Exceed Robotics operates in the GTA (CAD), not India (INR) — the original
     * default was wrong for this business. No data backfill needed: 0 payment
     * rows exist in any environment, and every insert already sets currency
     * explicitly (this only corrects the column's default for any future
     * direct-SQL insert that omits it).
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'CAD'");
        }
        // SQLite has no lightweight ALTER COLUMN SET DEFAULT; skipped there since
        // no code path relies on the column default (currency is always passed
        // explicitly), so this is cosmetic-only on the dev database.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'INR'");
        }
    }
};
