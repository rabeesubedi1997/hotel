<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\PaymentException;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin → Payment Gateways. Holds API secrets, so it is limited to admin /
 * super_admin — the `/admin` route group is also reachable by vendors and by
 * anyone granted the dashboard permission, which is far too broad here.
 */
class PaymentGatewayController extends Controller
{
    public function __construct(private PaymentGatewayManager $manager)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json([
            'gateways' => PaymentGateway::ordered()->get()->map(fn ($g) => $this->serialize($g))->values(),
            'drivers' => $this->manager->schemas(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $validated = $request->validate([
            'driver' => ['required', Rule::in(array_keys($this->manager->drivers()))],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'code' => ['nullable', 'alpha_dash', 'max:50', 'unique:payment_gateways,code'],
            'mode' => ['nullable', Rule::in([PaymentGateway::MODE_SANDBOX, PaymentGateway::MODE_LIVE])],
            'currency' => 'nullable|string|size:3',
            'credentials' => 'nullable|array',
            'settings' => 'nullable|array',
        ]);

        $driver = $this->manager->driverClass($validated['driver']);
        $currency = strtoupper($validated['currency'] ?? $driver::defaultCurrency());
        $this->assertCurrencySupported($driver, $currency);

        $gateway = new PaymentGateway([
            'driver' => $validated['driver'],
            'code' => $validated['code'] ?? $this->uniqueCode($validated['name']),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'mode' => $validated['mode'] ?? PaymentGateway::MODE_SANDBOX,
            'currency' => $currency,
            // New gateways start disabled: they can't be enabled until
            // credentials exist for the selected mode (see update()).
            'is_enabled' => false,
            'sort_order' => (int) PaymentGateway::max('sort_order') + 1,
        ]);
        $gateway->credentials = $this->mergeCredentials($gateway, $validated['credentials'] ?? [], $driver);
        $gateway->settings = $this->mergeSettings($gateway, $validated['settings'] ?? [], $driver);
        $gateway->save();

        AdminAuditLog::record($request->user(), 'create', 'PaymentGateway', $gateway->id, null, null, $this->auditView($gateway));

        return response()->json(['message' => 'Payment gateway created.', 'gateway' => $this->serialize($gateway)], 201);
    }

    public function update(Request $request, PaymentGateway $paymentGateway): JsonResponse
    {
        $this->authorizeManage($request);
        $gateway = $paymentGateway;
        $driver = $gateway->driverClass();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:500',
            'mode' => ['sometimes', Rule::in([PaymentGateway::MODE_SANDBOX, PaymentGateway::MODE_LIVE])],
            'currency' => 'sometimes|string|size:3',
            'is_enabled' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
            'credentials' => 'nullable|array',
            'settings' => 'nullable|array',
        ]);

        $before = $this->auditView($gateway);

        if (isset($validated['currency'])) {
            $validated['currency'] = strtoupper($validated['currency']);
            $this->assertCurrencySupported($driver, $validated['currency']);
        }

        $gateway->fill(collect($validated)->except(['credentials', 'settings'])->all());

        $credentialsTouched = !empty($validated['credentials']);
        if ($credentialsTouched && $driver) {
            $gateway->credentials = $this->mergeCredentials($gateway, $validated['credentials'], $driver);
        }

        $settingsTouched = !empty($validated['settings']);
        if ($settingsTouched && $driver) {
            $gateway->settings = $this->mergeSettings($gateway, $validated['settings'], $driver);
        }

        // Evaluated on the resulting state, so flipping to live without live
        // keys (or enabling an unconfigured gateway) is refused.
        if ($gateway->is_enabled && !$gateway->isConfigured()) {
            $labels = $this->missingLabels($gateway);
            throw ValidationException::withMessages([
                'is_enabled' => ['Cannot enable "' . $gateway->name . '" in ' . $gateway->mode . ' mode — missing: ' . implode(', ', $labels) . '.'],
            ]);
        }

        $gateway->save();

        AdminAuditLog::record(
            $request->user(), 'update', 'PaymentGateway', $gateway->id, null,
            $before, $this->auditView($gateway) + ['credentials_changed' => $credentialsTouched, 'settings_changed' => $settingsTouched]
        );

        return response()->json(['message' => 'Payment gateway updated.', 'gateway' => $this->serialize($gateway->fresh())]);
    }

    public function destroy(Request $request, PaymentGateway $paymentGateway): JsonResponse
    {
        $this->authorizeManage($request);

        if (Payment::where('gateway_code', $paymentGateway->code)->exists()) {
            return response()->json([
                'message' => 'This gateway has payment history and cannot be deleted. Disable it instead.',
            ], 422);
        }

        AdminAuditLog::record($request->user(), 'delete', 'PaymentGateway', $paymentGateway->id, null, $this->auditView($paymentGateway), null);
        $paymentGateway->delete();

        return response()->json(['message' => 'Payment gateway deleted.']);
    }

    public function reorder(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:payment_gateways,id',
        ]);

        foreach (array_values($validated['ids']) as $position => $id) {
            PaymentGateway::whereKey($id)->update(['sort_order' => $position + 1]);
        }

        return response()->json(['message' => 'Order saved.']);
    }

    /** Calls the provider with the saved credentials for the gateway's active mode. */
    public function test(Request $request, PaymentGateway $paymentGateway): JsonResponse
    {
        $this->authorizeManage($request);

        if (!$paymentGateway->isConfigured()) {
            return response()->json([
                'ok' => false,
                'message' => 'Missing: ' . implode(', ', $this->missingLabels($paymentGateway)) . '.',
            ], 422);
        }

        try {
            return response()->json($paymentGateway->driverInstance()->testConnection($paymentGateway));
        } catch (PaymentException $e) {
            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    private function authorizeManage(Request $request): void
    {
        $user = $request->user();
        abort_unless($user && ($user->isSuperAdmin() || $user->isAdmin()), 403, 'Only administrators can manage payment gateways.');
    }

    private function assertCurrencySupported(?string $driver, string $currency): void
    {
        $supported = $driver ? $driver::supportedCurrencies() : null;
        if ($supported && !in_array($currency, $supported, true)) {
            throw ValidationException::withMessages([
                'currency' => [$driver::label() . ' only supports: ' . implode(', ', $supported) . '.'],
            ]);
        }
    }

    private function uniqueCode(string $name): string
    {
        $base = Str::limit(Str::slug($name) ?: 'gateway', 40, '');
        $code = $base;
        $i = 2;
        while (PaymentGateway::where('code', $code)->exists()) {
            $code = $base . '-' . $i++;
        }

        return $code;
    }

    /**
     * Apply submitted credential values onto the existing ones. A blank
     * secret means "keep what's stored" (the form never receives secrets
     * back, only a masked hint); unknown keys are ignored.
     */
    private function mergeCredentials(PaymentGateway $gateway, array $incoming, string $driver): array
    {
        $current = $gateway->credentials ?? [];
        $fields = collect($driver::fields())->keyBy('key');

        foreach ([PaymentGateway::MODE_SANDBOX, PaymentGateway::MODE_LIVE] as $mode) {
            foreach (($incoming[$mode] ?? []) as $key => $value) {
                $field = $fields->get($key);
                if (!$field) {
                    continue;
                }

                $value = is_string($value) ? trim($value) : '';

                if (($field['secret'] ?? false) && $value === '') {
                    continue;
                }

                if ($value !== '' && ($field['type'] ?? 'text') === 'url') {
                    $this->assertSafeUrl($value, "credentials.{$mode}.{$key}");
                }

                if ($value === '') {
                    unset($current[$mode][$key]);
                } else {
                    $current[$mode][$key] = $value;
                }
            }
        }

        return $current;
    }

    /**
     * Apply submitted driver settings (mode-independent, non-secret).
     * Validates against the driver's own declaration so a typo is caught
     * here, at save time, rather than when a customer tries to pay.
     */
    private function mergeSettings(PaymentGateway $gateway, array $incoming, string $driver): array
    {
        $current = $gateway->settings ?? [];
        $fields = collect($driver::settingsFields())->keyBy('key');

        foreach ($incoming as $key => $value) {
            $field = $fields->get($key);
            if (!$field) {
                continue;
            }

            $value = is_string($value) ? trim($value) : '';
            $path = "settings.{$key}";

            if (mb_strlen($value) > 5000) {
                throw ValidationException::withMessages([$path => ['Too long.']]);
            }

            if ($value !== '') {
                $type = $field['type'] ?? 'text';

                if ($type === 'select' && !in_array($value, array_column($field['options'] ?? [], 'value'), true)) {
                    throw ValidationException::withMessages([$path => ['Choose one of the listed options.']]);
                }

                if ($type === 'json' && !is_array(json_decode($value, true))) {
                    throw ValidationException::withMessages([$path => ['"' . $field['label'] . '" must be valid JSON (check quotes and commas).']]);
                }

                if (isset($field['allowed_placeholders'])) {
                    preg_match_all('/\{(\w+)\}/', $value, $found);
                    $unknown = array_values(array_diff(array_unique($found[1]), $field['allowed_placeholders']));
                    if ($unknown) {
                        throw ValidationException::withMessages([$path => [
                            'Unknown placeholder ' . implode(', ', array_map(fn ($u) => '{' . $u . '}', $unknown)) . ' in "' . $field['label'] . '".',
                        ]]);
                    }
                }
            }

            if ($value === '') {
                unset($current[$key]);
            } else {
                $current[$key] = $value;
            }
        }

        return $current;
    }

    // The server sends API secrets to this URL, so plain http (or a typo'd
    // scheme) is refused outside local development.
    private function assertSafeUrl(string $url, string $field): void
    {
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $ok = filter_var($url, FILTER_VALIDATE_URL) && ($scheme === 'https' || ($scheme === 'http' && app()->environment('local')));

        if (!$ok) {
            throw ValidationException::withMessages([$field => ['Must be a valid https:// URL.']]);
        }
    }

    private function missingLabels(PaymentGateway $gateway): array
    {
        $driver = $gateway->driverClass();
        $labels = collect($driver ? array_merge($driver::fields(), $driver::settingsFields()) : [])->pluck('label', 'key');

        return collect($gateway->missingAll())->map(fn ($k) => $labels->get($k, $k))->all();
    }

    private function serialize(PaymentGateway $gateway): array
    {
        return [
            'id' => $gateway->id,
            'code' => $gateway->code,
            'driver' => $gateway->driver,
            'name' => $gateway->name,
            'description' => $gateway->description,
            'mode' => $gateway->mode,
            'is_enabled' => $gateway->is_enabled,
            'sort_order' => $gateway->sort_order,
            'currency' => $gateway->currency,
            'configured' => $gateway->isConfigured(),
            'missing' => $this->missingLabels($gateway),
            'credentials' => $gateway->maskedCredentials(),
            'settings' => $gateway->settingsForAdmin(),
            'payments_count' => Payment::where('gateway_code', $gateway->code)->count(),
        ];
    }

    /** Non-secret snapshot for the audit log — never includes credentials. */
    private function auditView(PaymentGateway $gateway): array
    {
        return $gateway->only(['code', 'driver', 'name', 'mode', 'is_enabled', 'currency', 'sort_order']);
    }
}
