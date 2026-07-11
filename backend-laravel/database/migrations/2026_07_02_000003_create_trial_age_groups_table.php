<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trial_age_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('course');                // "Robotics" | "Coding"
            $table->string('orbund_program_id', 20); // e.g. "4001270"
            $table->string('orbund_level_id', 20);   // e.g. "4000281"
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        DB::table('trial_age_groups')->insert([
            ['name' => '7 Years Old',                'course' => 'Robotics', 'orbund_program_id' => '4001270', 'orbund_level_id' => '4000281', 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['name' => '8 Years Old',                'course' => 'Robotics', 'orbund_program_id' => '4001271', 'orbund_level_id' => '4000281', 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['name' => '9–11 Years Old',             'course' => 'Robotics', 'orbund_program_id' => '4001272', 'orbund_level_id' => '4000281', 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['name' => '12–15 Years Old (Robotics)', 'course' => 'Robotics', 'orbund_program_id' => '4001273', 'orbund_level_id' => '4000281', 'sort_order' => 4, 'created_at' => $now, 'updated_at' => $now],
            ['name' => '12–15 Years Old (Coding)',   'course' => 'Coding',   'orbund_program_id' => '4001274', 'orbund_level_id' => '4000282', 'sort_order' => 5, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('trial_age_groups');
    }
};
