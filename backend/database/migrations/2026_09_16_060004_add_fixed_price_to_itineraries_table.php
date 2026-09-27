<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('itineraries', function (Blueprint $table) {
            $table->decimal('fixed_price', 10, 2)->nullable()->after('price_from');
            $table->unsignedInteger('max_travelers')->nullable()->after('fixed_price');
        });
    }

    public function down(): void
    {
        Schema::table('itineraries', function (Blueprint $table) {
            $table->dropColumn(['fixed_price', 'max_travelers']);
        });
    }
};
