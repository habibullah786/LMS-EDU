<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('status')->default('open'); // open | checked_out | abandoned
            $table->timestamps();
        });

        // MySQL/MariaDB do not support partial indexes. Application-level cart
        // creation already serializes this lookup, so retain a lookup index on
        // those platforms and use the stronger partial constraint elsewhere.
        if (DB::connection()->getDriverName() === 'mysql') {
            Schema::table('carts', function (Blueprint $table) {
                $table->index(['user_id', 'status'], 'idx_carts_user_status');
            });
        } else {
            DB::statement("CREATE UNIQUE INDEX idx_carts_one_open_per_user ON carts (user_id) WHERE status = 'open'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
