<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->string('orbund_campus_type', 10)->nullable()->after('location');
        });

        // Seed the three Exceed Robotics locations with their Orbund campusType IDs
        DB::table('departments')->upsert([
            ['name' => 'Thornhill',        'location' => 'Thornhill',        'orbund_campus_type' => '1', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Richmond Hill',    'location' => 'Richmond Hill',    'orbund_campus_type' => '3', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Yonge & Lawrence', 'location' => 'Yonge & Lawrence', 'orbund_campus_type' => '6', 'created_at' => now(), 'updated_at' => now()],
        ], ['name'], ['location', 'orbund_campus_type', 'updated_at']);

        // Seed programs (Robotics and Coding)
        DB::table('programs')->upsert([
            ['name' => 'Robotics', 'description' => 'Robots, programming, design, 3D printing, electronics and microcontrollers.', 'department' => 'STEM', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Coding',   'description' => 'Python, game programming, AI, face detection and voice detection.',          'department' => 'STEM', 'created_at' => now(), 'updated_at' => now()],
        ], ['name'], ['description', 'updated_at']);
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn('orbund_campus_type');
        });
    }
};
