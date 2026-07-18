<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// SQLite does not support ALTER COLUMN, so we recreate the table with updated schema:
// - location and course changed from enum to string (to accept Orbund values like "Thornhill")
// - instructor made nullable
// - unique constraint on (enrollment_id, student_id, class_id) removed (student_id can repeat per class)
return new class extends Migration {
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            Schema::table('enrollment_students', function (Blueprint $table) {
                $table->dropForeign(['student_id']);
                $table->dropUnique(['enrollment_id', 'student_id', 'class_id']);
            });

            DB::statement('ALTER TABLE enrollment_students ALTER COLUMN student_id DROP NOT NULL');
            DB::statement('ALTER TABLE enrollment_students DROP CONSTRAINT IF EXISTS enrollment_students_course_check');
            DB::statement('ALTER TABLE enrollment_students DROP CONSTRAINT IF EXISTS enrollment_students_location_check');
            DB::statement('ALTER TABLE enrollment_students DROP CONSTRAINT IF EXISTS enrollment_students_type_check');
            DB::statement("ALTER TABLE enrollment_students ALTER COLUMN instructor SET DEFAULT ''");

            return;
        }

        DB::statement('PRAGMA foreign_keys = OFF');

        Schema::create('enrollment_students_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
            $table->unsignedBigInteger('student_id')->nullable();
            $table->string('class_id');
            $table->string('class_name');
            $table->string('course');     // string — accepts Coding, Robotics, AI, Game
            $table->string('location');   // string — accepts Thornhill, Richmond Hill, Yonge & Lawrence, etc.
            $table->string('instructor')->default('');
            $table->decimal('price', 10, 2);
            $table->string('type')->default('Trial');
            $table->timestamps();

            $table->index('enrollment_id');
            $table->index('student_id');
            $table->index(['location', 'course']);
        });

        // Copy existing rows
        DB::statement('
            INSERT INTO enrollment_students_new
                (id, enrollment_id, student_id, class_id, class_name, course, location, instructor, price, type, created_at, updated_at)
            SELECT
                id, enrollment_id, student_id, class_id, class_name, course, location, instructor, price, type, created_at, updated_at
            FROM enrollment_students
        ');

        Schema::drop('enrollment_students');
        Schema::rename('enrollment_students_new', 'enrollment_students');

        DB::statement('PRAGMA foreign_keys = ON');
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE enrollment_students ALTER COLUMN instructor DROP DEFAULT');
            DB::statement("ALTER TABLE enrollment_students ADD CONSTRAINT enrollment_students_course_check CHECK (course IN ('Coding', 'Robotics'))");
            DB::statement("ALTER TABLE enrollment_students ADD CONSTRAINT enrollment_students_location_check CHECK (location IN ('Delhi', 'Bengaluru', 'Kolkata'))");
            DB::statement("ALTER TABLE enrollment_students ADD CONSTRAINT enrollment_students_type_check CHECK (type IN ('Trial', 'Paid'))");
            DB::statement('ALTER TABLE enrollment_students ALTER COLUMN student_id SET NOT NULL');

            Schema::table('enrollment_students', function (Blueprint $table) {
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
                $table->unique(['enrollment_id', 'student_id', 'class_id']);
            });

            return;
        }

        DB::statement('PRAGMA foreign_keys = OFF');

        Schema::create('enrollment_students_old', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('enrollments')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('class_id');
            $table->string('class_name');
            $table->enum('course', ['Coding', 'Robotics']);
            $table->enum('location', ['Delhi', 'Bengaluru', 'Kolkata']);
            $table->string('instructor');
            $table->decimal('price', 10, 2);
            $table->enum('type', ['Trial', 'Paid'])->default('Trial');
            $table->timestamps();

            $table->unique(['enrollment_id', 'student_id', 'class_id']);
            $table->index('enrollment_id');
            $table->index('student_id');
            $table->index(['location', 'course']);
        });

        DB::statement('
            INSERT INTO enrollment_students_old
                (id, enrollment_id, student_id, class_id, class_name, course, location, instructor, price, type, created_at, updated_at)
            SELECT
                id, enrollment_id, student_id, class_id, class_name, course, location, instructor, price, type, created_at, updated_at
            FROM enrollment_students
        ');

        Schema::drop('enrollment_students');
        Schema::rename('enrollment_students_old', 'enrollment_students');

        DB::statement('PRAGMA foreign_keys = ON');
    }
};
