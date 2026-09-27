<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itineraries', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('cover_image')->nullable();

            // 'curated' = admin-built package shown on the public Itineraries page.
            // 'personal' = a customer's own trip plan, private to them.
            $table->string('type')->default('personal');

            // Null for curated itineraries (admin-owned); set to the owning
            // customer for personal trip plans.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->boolean('is_public')->default(false);
            $table->string('status')->default('draft'); // draft, published
            $table->unsignedInteger('duration_days')->default(1);
            $table->decimal('price_from', 10, 2)->nullable();

            // Mirrors Hotel/Activity's approval workflow fields so curated
            // itineraries can be routed through admin approval if vendor
            // curation is added later. Defaults to 'approved' since only
            // admins create curated itineraries for now.
            $table->string('approval_status')->default('approved');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itineraries');
    }
};
