<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\User;

class CouponService
{
    /**
     * Validate a coupon code against an order and return the discount it
     * would apply, without recording a redemption. Never trust a
     * client-computed discount — callers must re-run this at booking time.
     *
     * @return array{valid: bool, message: string, discount_amount: float, coupon: ?Coupon}
     */
    public function evaluate(string $code, User $user, float $orderAmount, string $bookableScope = 'all'): array
    {
        $coupon = Coupon::active()->where('code', strtoupper(trim($code)))->first();

        if (!$coupon) {
            return $this->invalid('Invalid coupon code.');
        }

        $now = now();
        if ($coupon->valid_from && $now->lt($coupon->valid_from)) {
            return $this->invalid('This coupon is not active yet.');
        }
        if ($coupon->valid_until && $now->gt($coupon->valid_until)) {
            return $this->invalid('This coupon has expired.');
        }

        if ($coupon->applicable_to !== Coupon::SCOPE_ALL && $coupon->applicable_to !== $bookableScope) {
            return $this->invalid('This coupon is not valid for this booking type.');
        }

        if ($orderAmount < (float) $coupon->min_order_amount) {
            return $this->invalid("This coupon requires a minimum order of \${$coupon->min_order_amount}.");
        }

        if ($coupon->usage_limit !== null && $coupon->redemptions()->count() >= $coupon->usage_limit) {
            return $this->invalid('This coupon has reached its usage limit.');
        }

        $userRedemptions = $coupon->redemptions()->where('user_id', $user->id)->count();
        if ($userRedemptions >= $coupon->usage_limit_per_user) {
            return $this->invalid('You have already used this coupon.');
        }

        $discount = $coupon->type === Coupon::TYPE_PERCENT
            ? $orderAmount * ((float) $coupon->value / 100)
            : (float) $coupon->value;

        if ($coupon->max_discount_amount !== null) {
            $discount = min($discount, (float) $coupon->max_discount_amount);
        }

        $discount = round(min($discount, $orderAmount), 2);

        return [
            'valid' => true,
            'message' => 'Coupon applied.',
            'discount_amount' => $discount,
            'coupon' => $coupon,
        ];
    }

    public function recordRedemption(Coupon $coupon, User $user, float $discountAmount, ?int $bookingId = null): CouponRedemption
    {
        return CouponRedemption::create([
            'coupon_id' => $coupon->id,
            'user_id' => $user->id,
            'booking_id' => $bookingId,
            'discount_amount' => $discountAmount,
        ]);
    }

    private function invalid(string $message): array
    {
        return ['valid' => false, 'message' => $message, 'discount_amount' => 0.0, 'coupon' => null];
    }
}
