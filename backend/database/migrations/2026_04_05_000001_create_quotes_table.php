<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('quote_number')->unique();
            $table->string('name');
            $table->string('email');
            $table->string('phone');
            $table->string('package_type'); // adventure, cultural, luxury, budget
            $table->integer('duration_days');
            $table->integer('travelers');
            $table->date('start_date')->nullable();
            $table->text('requirements');
            $table->json('preferred_activities')->nullable();
            $table->json('preferred_hotels')->nullable();
            $table->decimal('estimated_budget', 10, 2)->nullable();
            $table->decimal('quoted_amount', 10, 2)->nullable();
            $table->text('admin_notes')->nullable();
            $table->enum('status', ['pending', 'quoted', 'accepted', 'rejected', 'expired'])->default('pending');
            $table->timestamp('quoted_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
