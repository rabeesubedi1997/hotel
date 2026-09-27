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
        Schema::table('rooms', function (Blueprint $table) {
            $table->string('ical_feed_url')->nullable();
            $table->string('ical_token')->nullable()->unique();
        });

        Schema::table('activities', function (Blueprint $table) {
            $table->string('ical_feed_url')->nullable();
            $table->string('ical_token')->nullable()->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn(['ical_feed_url', 'ical_token']);
        });

        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['ical_feed_url', 'ical_token']);
        });
    }
};
