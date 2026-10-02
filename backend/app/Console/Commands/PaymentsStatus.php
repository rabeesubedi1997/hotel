<?php

namespace App\Console\Commands;

use App\Models\PaymentGateway;
use App\Services\Payments\CurrencyConverter;
use App\Services\Payments\PaymentException;
use Illuminate\Console\Command;

/**
 * Read-only health check for the payment gateways — run at the end of every
 * deploy (see scripts/deploy-server.sh) so a gateway that is enabled but
 * cannot actually take a payment is noticed immediately, not by a customer.
 */
class PaymentsStatus extends Command
{
    protected $signature = 'payments:status';

    protected $description = 'Show each payment gateway\'s mode, enabled state and readiness';

    public function handle(CurrencyConverter $converter): int
    {
        $gateways = PaymentGateway::ordered()->get();

        if ($gateways->isEmpty()) {
            $this->warn('No payment gateways found — has the payment_gateways migration run?');

            return self::SUCCESS;
        }

        $problems = 0;
        $rows = [];

        foreach ($gateways as $gateway) {
            $driver = $gateway->driverClass();
            $offline = $driver && $driver::isOffline();
            $notes = [];

            if (!$driver) {
                $notes[] = "driver \"{$gateway->driver}\" not installed";
            } elseif (!$gateway->isConfigured()) {
                $notes[] = 'missing ' . implode(', ', $gateway->missingAll()) . " ({$gateway->mode})";
            }

            if ($driver && !$offline && $gateway->is_enabled) {
                try {
                    $converter->convert(1.0, $gateway->currency);
                } catch (PaymentException $e) {
                    $notes[] = 'no ' . config('payments.base_currency') . " → {$gateway->currency} exchange rate";
                }
            }

            // Only an ENABLED gateway that can't work is a problem; a disabled,
            // not-yet-configured one is just waiting for its keys.
            if ($gateway->is_enabled && $notes) {
                $problems++;
            }

            $rows[] = [
                $gateway->code,
                $gateway->driver,
                $offline ? '-' : $gateway->mode,
                $gateway->is_enabled ? 'ON' : 'off',
                $notes ? implode('; ', $notes) : 'ready',
            ];
        }

        $this->table(['Gateway', 'Driver', 'Mode', 'Enabled', 'Status'], $rows);

        if ($problems > 0) {
            $this->error("{$problems} enabled gateway(s) cannot take payments yet — customers will not see them at checkout.");
        } else {
            $this->info('All enabled gateways are ready.');
        }

        // Informational only: a deploy must never fail because of payment config.
        return self::SUCCESS;
    }
}
