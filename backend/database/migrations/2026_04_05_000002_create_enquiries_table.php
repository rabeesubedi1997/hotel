<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('enquiry_number')->unique();
            $table->string('name');
            $table->string('email');
            $table->string('phone');
            $table->enum('type', ['booking', 'general', 'package', 'custom']);
            $table->string('subject');
            $table->text('message');
            $table->json('related_items')->nullable(); // hotels or activities ids
            $table->enum('status', ['new', 'in_progress', 'resolved', 'closed'])->default('new');
            $table->text('admin_response')->nullable();
            $table->foreignId('responded_by')->nullable()->constrained('users');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
