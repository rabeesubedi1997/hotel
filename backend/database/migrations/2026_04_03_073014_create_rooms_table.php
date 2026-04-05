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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_id')->constrained()->onDelete('cascade');
            $table->string('room_type');
            $table->string('room_number')->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('capacity')->default(2);
            $table->integer('bed_count')->default(1);
            $table->enum('bed_type', ['single', 'double', 'queen', 'king', 'bunk'])->default('double');
            $table->json('amenities')->nullable();
            $table->json('images')->nullable();
            $table->integer('available_count')->default(1);
            $table->enum('status', ['available', 'occupied', 'maintenance', 'cleaning'])->default('available');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
