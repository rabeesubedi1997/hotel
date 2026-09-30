<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Scopes a staff user's Restaurant POS access to one specific
        // Hotel/Activity — the "Kitchen Staff" role grants the
        // restaurant.kitchen.* permissions globally, but a permission alone
        // doesn't say WHICH vendor's kitchen this login may see, since
        // Kitchen Staff (unlike a Vendor) doesn't own the property itself.
        Schema::create('restaurant_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('owner');
            $table->timestamps();

            $table->unique(['user_id', 'owner_type', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_staff');
    }
};
