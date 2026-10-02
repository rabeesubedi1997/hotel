<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mode-independent, non-secret configuration (e.g. the endpoint
        // paths and response mapping of a Custom gateway). Credentials stay
        // in the encrypted, per-mode `credentials` column.
        Schema::table('payment_gateways', function (Blueprint $table) {
            $table->json('settings')->nullable()->after('credentials');
        });
    }

    public function down(): void
    {
        Schema::table('payment_gateways', function (Blueprint $table) {
            $table->dropColumn('settings');
        });
    }
};
