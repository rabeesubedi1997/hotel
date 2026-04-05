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
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('type')->default('other');
            $table->string('location');
            $table->string('city');
            $table->string('duration');
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('max_participants')->default(10);
            $table->enum('difficulty_level', ['easy', 'moderate', 'challenging', 'extreme'])->default('moderate');
            $table->json('includes')->nullable();
            $table->json('images')->nullable();
            $table->string('featured_image')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->enum('status', ['active', 'inactive', 'seasonal'])->default('active');
            $table->text('requirements')->nullable();
            $table->text('safety_info')->nullable();
            $table->decimal('rating', 2, 1)->default(0);
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
        Schema::dropIfExists('activities');
    }
};
