<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('certificates');
        Schema::dropIfExists('school_class_waitlists');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('companies');

        if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'payment_plan')) {
            Schema::table('payments', fn (Blueprint $table) => $table->dropColumn('payment_plan'));
        }
        if (Schema::hasTable('school_classes') && Schema::hasColumn('school_classes', 'hide_when_full')) {
            Schema::table('school_classes', fn (Blueprint $table) => $table->dropColumn('hide_when_full'));
        }
        if (Schema::hasTable('school_classes') && Schema::hasColumn('school_classes', 'modules')) {
            Schema::table('school_classes', fn (Blueprint $table) => $table->dropColumn('modules'));
        }
    }

    public function down(): void
    {
        // The removed feature and its data are intentionally not recreated.
    }
};
