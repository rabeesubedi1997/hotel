<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tour_guides', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('image')->nullable();
            $table->string('role')->default('Tour Guide');
            $table->text('bio')->nullable();
            $table->integer('trips_completed')->default(0);
            $table->decimal('rating', 2, 1)->default(5.0);
            $table->integer('total_reviews')->default(0);
            $table->boolean('is_available_for_hire')->default(true);
            $table->decimal('hire_price_per_day', 10, 2)->nullable();
            $table->json('languages')->nullable(); // Array of languages spoken
            $table->json('specialties')->nullable(); // Array of specialties (e.g., Historical, Adventure, Food)
            $table->json('certifications')->nullable(); // Array of certifications
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();
        });

        // Create pivot table for tour guide bookings
        Schema::create('tour_guide_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_guide_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('booking_date');
            $table->integer('duration_days')->default(1);
            $table->text('message')->nullable();
            $table->string('status')->default('pending'); // pending, confirmed, completed, cancelled
            $table->decimal('total_price', 10, 2)->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tour_guide_bookings');
        Schema::dropIfExists('tour_guides');
    }
};
