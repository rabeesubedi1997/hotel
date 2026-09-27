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
        Schema::table('tour_guide_bookings', function (Blueprint $table) {
            $table->timestamp('response_due_at')->nullable()->after('status');
            $table->timestamp('escalated_at')->nullable()->after('response_due_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tour_guide_bookings', function (Blueprint $table) {
            $table->dropColumn(['response_due_at', 'escalated_at']);
        });
    }
};
