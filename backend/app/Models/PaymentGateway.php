<?php

namespace App\Models;

use App\Services\Payments\PaymentDriver;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class PaymentGateway extends Model
{
    const MODE_SANDBOX = 'sandbox';
    const MODE_LIVE = 'live';

    protected $fillable = [
        'code', 'driver', 'name', 'description', 'mode',
        'is_enabled', 'sort_order', 'currency', 'credentials',
    ];

    // Secrets must never leave the server via normal serialization — the
    // admin API returns a masked view built by maskedCredentials().
    protected $hidden = ['credentials'];

    protected $casts = [
        'is_enabled' => 'boolean',
        'sort_order' => 'integer',
        // Encrypted with APP_KEY. If APP_KEY is ever rotated these become
        // unreadable and the credentials must be re-entered.
        'credentials' => 'encrypted:array',
    ];

    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('is_enabled', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    public function isLive(): bool
    {
        return $this->mode === self::MODE_LIVE;
    }

    /** @return class-string<PaymentDriver>|null */
    public function driverClass(): ?string
    {
        return app(PaymentGatewayManager::class)->driverClass($this->driver);
    }

    public function driverInstance(): PaymentDriver
    {
        return app(PaymentGatewayManager::class)->driver($this);
    }

    /** Credential values for one mode (defaults to the gateway's active mode). */
    public function credentialsFor(?string $mode = null): array
    {
        return $this->credentials[$mode ?? $this->mode] ?? [];
    }

    public function credential(string $key, ?string $mode = null): ?string
    {
        $value = $this->credentialsFor($mode)[$key] ?? null;

        return ($value === null || $value === '') ? null : (string) $value;
    }

    /** Required credential keys that are still empty for the given mode. */
    public function missingCredentials(?string $mode = null): array
    {
        $driver = $this->driverClass();
        if (!$driver) {
            return ['driver'];
        }

        $missing = [];
        foreach ($driver::fields() as $field) {
            if (($field['required'] ?? false) && $this->credential($field['key'], $mode) === null) {
                $missing[] = $field['key'];
            }
        }

        return $missing;
    }

    public function isConfigured(?string $mode = null): bool
    {
        return $this->driverClass() !== null && empty($this->missingCredentials($mode));
    }

    /**
     * Admin-facing credentials with secrets masked, shaped
     * { sandbox: {key: value|{set,hint}}, live: {...} }.
     */
    public function maskedCredentials(): array
    {
        $driver = $this->driverClass();
        $out = [];

        foreach ([self::MODE_SANDBOX, self::MODE_LIVE] as $mode) {
            $out[$mode] = [];
            foreach ($driver ? $driver::fields() : [] as $field) {
                $value = $this->credential($field['key'], $mode);
                if ($field['secret'] ?? false) {
                    $out[$mode][$field['key']] = [
                        'set' => $value !== null,
                        'hint' => $value !== null ? '••••' . substr($value, -4) : null,
                    ];
                } else {
                    $out[$mode][$field['key']] = $value ?? '';
                }
            }
        }

        return $out;
    }

    /** What the public checkout is allowed to know about this gateway. */
    public function toPublicArray(): array
    {
        $driver = $this->driverClass();

        return [
            'id' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'icon' => $driver ? $driver::icon() : 'wallet',
            'currency' => $driver && $driver::isOffline() ? config('payments.base_currency') : $this->currency,
            'offline' => $driver ? $driver::isOffline() : false,
            'sandbox' => !$this->isLive() && !($driver && $driver::isOffline()),
        ];
    }
}
