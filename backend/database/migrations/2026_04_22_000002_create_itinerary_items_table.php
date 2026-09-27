<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itinerary_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('itinerary_id')->constrained()->cascadeOnDelete();

            // Polymorphic like Booking::bookable — stores the fully
            // qualified model class (Hotel, Activity, or TourGuide).
            $table->string('bookable_type');
            $table->unsignedBigInteger('bookable_id');

            $table->unsignedInteger('day_number')->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['bookable_type', 'bookable_id']);
            $table->index(['itinerary_id', 'day_number', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itinerary_items');
    }
};
