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
        // CSV bulk import lets vendors paste any image URL (e.g. long
        // Wikimedia thumbnail paths that repeat the filename) — the default
        // VARCHAR(255) silently truncates or, under MySQL strict mode,
        // rejects the whole insert, which is what broke the Menu import.
        Schema::table('menu_items', function (Blueprint $table) {
            $table->string('image', 2048)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->string('image')->nullable()->change();
        });
    }
};
