<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            // Price at time of adding; checkout re-validates against the live curriculum/course price.
            $table->decimal('price_snapshot', 10, 2);
            $table->timestamps();

            $table->unique(['cart_id', 'student_id', 'class_id']);
            $table->index('class_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
