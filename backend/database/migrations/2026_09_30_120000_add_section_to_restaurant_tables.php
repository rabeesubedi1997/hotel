<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_tables', function (Blueprint $table) {
            // Groups tables into floor-plan zones (e.g. "Main Dining", "Bar &
            // High Top", "Patio") for the Tables tab's floor-plan view.
            // Nullable/free-text — ungrouped tables fall into one catch-all
            // section rather than being hidden.
            $table->string('section')->nullable()->after('table_number');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->dropColumn('section');
        });
    }
};
