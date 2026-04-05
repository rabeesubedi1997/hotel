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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->onDelete('cascade');
            $table->enum('method', ['khalti', 'stripe', 'paypal', 'cash', 'bank_transfer'])->default('cash');
            $table->string('transaction_id')->nullable();
            $table->string('payment_intent_id')->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('currency')->default('NPR');
            $table->enum('status', ['pending', 'initiated', 'completed', 'failed', 'refunded', 'partially_refunded'])->default('pending');
            $table->json('response_data')->nullable();
            $table->json('request_data')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
