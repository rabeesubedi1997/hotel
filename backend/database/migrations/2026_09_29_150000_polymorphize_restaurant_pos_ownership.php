<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurant POS's hotel_id/activity_id dual-nullable-FK pattern replaced
 * with a single owner_id/owner_type morph pair, so "ownable by a Hotel or
 * an Activity" is one relation instead of two hand-duplicated ones.
 *
 * MySQL DDL is not transactional — if this fails partway on the live
 * server, the affected table(s) are left with the new owner_id/owner_type
 * columns alongside the still-present legacy columns (a valid, if
 * incomplete, intermediate state — not corruption). The fix is to resolve
 * the underlying error and re-run `php artisan migrate`, not
 * `migrate:rollback`, since the already-committed DDL steps can't be
 * undone by a failed transaction. Every step below is safe to re-attempt:
 * the backfill only touches rows matching `whereNotNull`, and step 4 (NOT
 * NULL) will fail loudly — before any column is dropped — if backfill
 * didn't complete for every row.
 */
return new class extends Migration
{
    private array $tables = ['menu_categories', 'menu_items', 'restaurant_tables', 'orders'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('owner_id')->nullable()->after('activity_id');
                $blueprint->string('owner_type')->nullable()->after('owner_id');
                $blueprint->index(['owner_type', 'owner_id']);
            });
        }

        foreach ($this->tables as $table) {
            DB::table($table)->whereNotNull('hotel_id')->update([
                'owner_type' => 'hotel',
                'owner_id' => DB::raw('hotel_id'),
            ]);
            DB::table($table)->whereNotNull('activity_id')->update([
                'owner_type' => 'activity',
                'owner_id' => DB::raw('activity_id'),
            ]);
        }

        // Drop the legacy FKs before touching menu_categories' unique
        // indexes below — MySQL refuses to drop an index a foreign key
        // still relies on (hotel_id/activity_id had no dedicated index of
        // their own, so the composite unique(['hotel_id','name']) was the
        // one satisfying the FK's index requirement).
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropForeign("{$table}_hotel_id_foreign");
                $blueprint->dropForeign("{$table}_activity_id_foreign");
            });
        }

        Schema::table('menu_categories', function (Blueprint $blueprint) {
            $blueprint->dropUnique(['hotel_id', 'name']);
            $blueprint->dropUnique(['activity_id', 'name']);
            $blueprint->unique(['owner_type', 'owner_id', 'name']);
        });

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('owner_id')->nullable(false)->change();
                $blueprint->string('owner_type')->nullable(false)->change();
            });
        }

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropColumn(['hotel_id', 'activity_id']);
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('hotel_id')->nullable()->after('id');
                $blueprint->foreignId('activity_id')->nullable()->after('hotel_id')->constrained()->cascadeOnDelete();
            });

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('hotel_id')->references('id')->on('hotels')->cascadeOnDelete();
            });

            DB::table($table)->where('owner_type', 'hotel')->update([
                'hotel_id' => DB::raw('owner_id'),
            ]);
            DB::table($table)->where('owner_type', 'activity')->update([
                'activity_id' => DB::raw('owner_id'),
            ]);
        }

        Schema::table('menu_categories', function (Blueprint $blueprint) {
            $blueprint->dropUnique(['owner_type', 'owner_id', 'name']);
            $blueprint->unique(['hotel_id', 'name']);
            $blueprint->unique(['activity_id', 'name']);
        });

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('hotel_id')->nullable(false)->change();
            });
        }

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropIndex(["{$table}_owner_type_owner_id_index"]);
                $blueprint->dropColumn(['owner_id', 'owner_type']);
            });
        }
    }
};
