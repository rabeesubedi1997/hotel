<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = ['menu_categories', 'menu_items', 'restaurant_tables', 'orders'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropForeign("{$table}_hotel_id_foreign");
            });

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('hotel_id')->nullable()->change();
                $blueprint->foreignId('activity_id')->nullable()->after('hotel_id')->constrained()->cascadeOnDelete();
            });

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('hotel_id')->references('id')->on('hotels')->cascadeOnDelete();
            });
        }

        // menu_categories' uniqueness needs to hold per-activity too, not just per-hotel.
        Schema::table('menu_categories', function (Blueprint $blueprint) {
            $blueprint->unique(['activity_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('menu_categories', function (Blueprint $blueprint) {
            $blueprint->dropUnique(['activity_id', 'name']);
        });

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropForeign(["{$table}_activity_id_foreign"]);
                $blueprint->dropColumn('activity_id');
                $blueprint->dropForeign(["{$table}_hotel_id_foreign"]);
            });

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('hotel_id')->nullable(false)->change();
                $blueprint->foreign('hotel_id')->references('id')->on('hotels')->cascadeOnDelete();
            });
        }
    }
};
