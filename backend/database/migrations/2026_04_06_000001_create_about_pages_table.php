<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('about_pages', function (Blueprint $table) {
            $table->id();
            $table->string('hero_title')->default('About Our Company');
            $table->text('hero_subtitle')->nullable();
            $table->string('hero_image')->nullable();
            $table->string('company_name')->default('ReserveNow');
            $table->text('company_description')->nullable();
            $table->string('mission_title')->default('Our Mission');
            $table->text('mission_description')->nullable();
            $table->string('vision_title')->default('Our Vision');
            $table->text('vision_description')->nullable();
            $table->string('story_title')->default('Our Story');
            $table->longText('story_content')->nullable();
            $table->json('features')->nullable(); // Array of features with icon, title, description
            $table->json('stats')->nullable(); // Array of stats with number, label
            $table->json('team_members')->nullable(); // Array of team members
            $table->string('contact_cta_title')->default('Get in Touch');
            $table->text('contact_cta_description')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('about_pages');
    }
};
