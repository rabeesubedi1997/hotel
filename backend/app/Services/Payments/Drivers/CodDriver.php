<?php

namespace App\Services\Payments\Drivers;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\PaymentDriver;

class CodDriver extends PaymentDriver
{
    public static function key(): string
    {
        return 'cod';
    }

    public static function label(): string
    {
        return 'Cash on Delivery';
    }

    public static function description(): string
    {
        return 'Customer pays in cash at the hotel or activity. No credentials needed.';
    }

    public static function icon(): string
    {
        return 'banknote';
    }

    public static function fields(): array
    {
        return [];
    }

    public static function isOffline(): bool
    {
        return true;
    }

    public static function paymentMethod(): string
    {
        return Payment::METHOD_CASH;
    }

    public function initiate(PaymentGateway $gateway, Payment $payment, array $context): array
    {
        return ['completed' => true];
    }

    public function verify(PaymentGateway $gateway, Payment $payment): array
    {
        return ['status' => 'completed', 'transaction_id' => null, 'raw' => []];
    }
}
