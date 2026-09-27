<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();

            // 'vendor_inquiry' = a customer messaging a specific vendor
            // about one of their listings. 'support' = a customer messaging
            // admin/support generally (vendor_id is null; any admin-level
            // user can see and reply to these).
            $table->string('type')->default('vendor_inquiry');

            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('users')->cascadeOnDelete();

            // What the inquiry is about, e.g. Hotel/Activity — optional
            // context shown in the thread header. Polymorphic, same
            // convention as Booking::bookable / ItineraryItem::bookable.
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();

            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'last_message_at']);
            $table->index(['vendor_id', 'last_message_at']);
            $table->index(['type', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
