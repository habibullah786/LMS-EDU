<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('gateway_order_id')->nullable()->unique();
            $table->timestamp('expires_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['gateway_order_id']);
            $table->dropColumn(['gateway_order_id', 'expires_at']);
        });
    }
};
