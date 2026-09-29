<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotels', function (Blueprint $table) {
            // 'on_order' (default): decrement stock the moment an order is
            // placed (existing behavior). 'on_complete': hold off until the
            // order is actually marked completed.
            $table->string('stock_deduction_mode')->default('on_order')->after('approval_status');
        });

        Schema::table('activities', function (Blueprint $table) {
            $table->string('stock_deduction_mode')->default('on_order')->after('approval_status');
        });

        Schema::table('orders', function (Blueprint $table) {
            // Tracks whether stock has already been decremented for this
            // order, regardless of which mode is active — this is what lets
            // cancellation know whether there's anything to restore, instead
            // of assuming "always decremented at creation" like before.
            $table->boolean('stock_deducted')->default(false)->after('is_rush');
        });

        // Every existing order was created under the old always-decrement-at-
        // creation behavior, so mark them as already deducted.
        \Illuminate\Support\Facades\DB::table('orders')->update(['stock_deducted' => true]);
    }

    public function down(): void
    {
        Schema::table('hotels', function (Blueprint $table) {
            $table->dropColumn('stock_deduction_mode');
        });

        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn('stock_deduction_mode');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('stock_deducted');
        });
    }
};
