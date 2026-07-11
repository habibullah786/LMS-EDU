<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('custom_workflows', function (Blueprint $table) {
            $table->string('condition_location')->nullable()->after('event_key');
            $table->string('condition_course')->nullable()->after('condition_location');
        });
    }

    public function down(): void
    {
        Schema::table('custom_workflows', function (Blueprint $table) {
            $table->dropColumn(['condition_location', 'condition_course']);
        });
    }
};
