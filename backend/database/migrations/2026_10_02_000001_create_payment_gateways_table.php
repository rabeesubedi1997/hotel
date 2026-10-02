<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            // `code` is the stable public identifier ("khalti", "stripe-eu"),
            // `driver` picks the PHP integration class (see config/payments.php).
            // Several gateways can share one driver (e.g. two Stripe accounts).
            $table->string('code', 50)->unique();
            $table->string('driver', 50);
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('mode', 10)->default('sandbox'); // sandbox | live
            $table->boolean('is_enabled')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('currency', 3)->default('USD');
            // Encrypted JSON: { sandbox: {key: value}, live: {key: value} }.
            $table->text('credentials')->nullable();
            $table->timestamps();
        });

        // `method` was a fixed ENUM — new gateways need arbitrary driver keys.
        Schema::table('payments', function (Blueprint $table) {
            $table->string('method', 50)->default('cash')->change();
            $table->string('gateway_code', 50)->nullable()->after('method');
            $table->string('mode', 10)->nullable()->after('gateway_code');
        });

        $now = now();
        DB::table('payment_gateways')->insert([
            [
                'code' => 'cod', 'driver' => 'cod', 'name' => 'Cash on Delivery',
                'description' => 'Pay at the hotel or activity location',
                'mode' => 'live', 'is_enabled' => true, 'sort_order' => 1, 'currency' => 'USD',
                'credentials' => null, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'code' => 'khalti', 'driver' => 'khalti', 'name' => 'Khalti Digital Wallet',
                'description' => 'Pay with your Khalti wallet',
                'mode' => 'sandbox', 'is_enabled' => false, 'sort_order' => 2, 'currency' => 'NPR',
                'credentials' => null, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'code' => 'stripe', 'driver' => 'stripe', 'name' => 'Credit / Debit Card',
                'description' => 'Secure card payment via Stripe',
                'mode' => 'sandbox', 'is_enabled' => false, 'sort_order' => 3, 'currency' => 'USD',
                'credentials' => null, 'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'code' => 'paypal', 'driver' => 'paypal', 'name' => 'PayPal',
                'description' => 'Pay with your PayPal account',
                'mode' => 'sandbox', 'is_enabled' => false, 'sort_order' => 4, 'currency' => 'USD',
                'credentials' => null, 'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['gateway_code', 'mode']);
        });
        Schema::dropIfExists('payment_gateways');
    }
};
