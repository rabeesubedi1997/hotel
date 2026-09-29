<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->string('sku')->nullable()->after('category');
            $table->decimal('cost_price', 10, 2)->nullable()->after('price');
            $table->string('station')->nullable()->after('sku');
            $table->json('allergens')->nullable()->after('station');
            $table->unsignedInteger('prep_time_minutes')->nullable()->after('allergens');
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn(['sku', 'cost_price', 'station', 'allergens', 'prep_time_minutes']);
        });
    }
};
