<?php

/*
|--------------------------------------------------------------------------
| Payment drivers
|--------------------------------------------------------------------------
|
| Each driver is a PHP class extending App\Services\Payments\PaymentDriver
| that knows how to talk to ONE payment provider. The actual gateways
| (credentials, sandbox/live mode, on/off, order) live in the
| `payment_gateways` table and are managed from Admin → Payment Gateways.
|
| To add a new provider: write a driver class, add it here — it then shows
| up in the admin "Add gateway" form with its own credential fields.
|
*/

return [
    'drivers' => [
        'cod' => \App\Services\Payments\Drivers\CodDriver::class,
        'khalti' => \App\Services\Payments\Drivers\KhaltiDriver::class,
        'stripe' => \App\Services\Payments\Drivers\StripeDriver::class,
        'paypal' => \App\Services\Payments\Drivers\PayPalDriver::class,
    ],

    // Prices are stored in this currency; gateways that charge in another
    // currency are converted using Admin → Currencies exchange rates.
    'base_currency' => 'USD',
];
