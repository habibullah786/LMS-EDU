<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The trial-registration lead-capture feature (POST /api/leads, step 1 of
     * the /trial funnel) was removed at the user's request. Drops the leads
     * table and the enrollments.lead_id column it was referenced from.
     */
    public function up(): void
    {
        // A prior table-rebuild migration (on SQLite only) left this index named
        // enrollments_new_lead_id_index instead of the conventional
        // enrollments_lead_id_index, so drop both names defensively rather than
        // relying on dropIndex(['lead_id'])'s single conventional-name guess.
        if (DB::connection()->getDriverName() === 'mysql') {
            Schema::table('enrollments', function (Blueprint $table) {
                $table->dropIndex('enrollments_lead_id_index');
            });
        } else {
            DB::statement('DROP INDEX IF EXISTS enrollments_lead_id_index');
            DB::statement('DROP INDEX IF EXISTS enrollments_new_lead_id_index');
        }

        Schema::table('enrollments', function (Blueprint $table) {
            $table->dropColumn('lead_id');
        });

        Schema::dropIfExists('leads');
    }

    /**
     * Reverse the migrations.
     *
     * Not reversible — dropping the leads table discards any captured lead
     * data, which can't be restored by a down() migration.
     */
    public function down(): void
    {
    }
};
