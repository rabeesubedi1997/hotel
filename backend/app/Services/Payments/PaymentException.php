<?php

namespace App\Services\Payments;

use RuntimeException;

/**
 * Thrown by drivers for any provider/config failure. The message is written
 * to be safe to show to the customer (no secrets, no raw provider payloads);
 * the full detail is logged by the driver instead.
 */
class PaymentException extends RuntimeException
{
}
