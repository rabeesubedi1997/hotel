<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add banner_order to hotels table
        Schema::table('hotels', function (Blueprint $table) {
            $table->integer('banner_order')->default(0)->after('is_featured');
            $table->boolean('show_in_banner')->default(false)->after('banner_order');
        });

        // Add banner_order to activities table
        Schema::table('activities', function (Blueprint $table) {
            $table->integer('banner_order')->default(0)->after('is_featured');
            $table->boolean('show_in_banner')->default(false)->after('banner_order');
        });
    }

    public function down(): void
    {
        Schema::table('hotels', function (Blueprint $table) {
            $table->dropColumn(['banner_order', 'show_in_banner']);
        });

        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['banner_order', 'show_in_banner']);
        });
    }
};
