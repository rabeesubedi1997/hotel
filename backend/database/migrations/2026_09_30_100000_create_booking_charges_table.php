<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            // Polymorphic source of the charge — a completed restaurant Order
            // today, open-ended for future charge types (minibar, spa, damage).
            $table->nullableMorphs('chargeable');
            $table->string('description');
            $table->decimal('amount', 10, 2);
            // pending: awaiting front-desk review; posted: counted in the
            // folio total; voided: reversed, excluded from the total.
            $table->string('status')->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_charges');
    }
};
