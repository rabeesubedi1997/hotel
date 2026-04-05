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
        Schema::create('hotels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('address');
            $table->string('city');
            $table->string('district');
            $table->decimal('price_per_night', 10, 2)->default(0);
            $table->decimal('rating', 2, 1)->default(0);
            $table->integer('star_rating')->default(3);
            $table->json('amenities')->nullable();
            $table->json('images')->nullable();
            $table->string('featured_image')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('policies')->nullable();
            $table->decimal('google_rating', 2, 1)->nullable();
            $table->integer('google_review_count')->default(0);
            $table->decimal('tripadvisor_rating', 2, 1)->nullable();
            $table->integer('tripadvisor_review_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hotels');
    }
};
