<?php

namespace App\Services;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyTransaction;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LoyaltyService
{
    private function account(User $user): LoyaltyAccount
    {
        return LoyaltyAccount::firstOrCreate(['user_id' => $user->id]);
    }

    private function earnRatePercent(): float
    {
        return (float) SiteSetting::getValue('loyalty_earn_rate_percent', 5);
    }

    private function pointsPerDollar(): float
    {
        return (float) SiteSetting::getValue('loyalty_redemption_rate', 100);
    }

    /** How much $1 of redemption costs in points — used by the frontend to preview a redemption. */
    public function pointsPerDollarPublic(): float
    {
        return $this->pointsPerDollar();
    }

    /**
     * Award points for a confirmed booking/package — amountPaid is the
     * actual amount charged (after any coupon discount), matching how much
     * value the customer actually brought in.
     */
    public function earnForBooking(User $user, float $amountPaid, ?int $bookingId = null, ?int $packageBookingId = null): void
    {
        $points = (int) round($amountPaid * ($this->earnRatePercent() / 100) * $this->pointsPerDollar());
        if ($points <= 0) return;

        DB::transaction(function () use ($user, $points, $bookingId, $packageBookingId) {
            $account = LoyaltyAccount::where('user_id', $user->id)->lockForUpdate()->first()
                ?? LoyaltyAccount::create(['user_id' => $user->id]);

            $account->increment('points_balance', $points);
            $account->increment('lifetime_points_earned', $points);

            LoyaltyTransaction::create([
                'user_id' => $user->id,
                'type' => LoyaltyTransaction::TYPE_EARN,
                'points' => $points,
                'booking_id' => $bookingId,
                'package_booking_id' => $packageBookingId,
                'balance_after' => $account->fresh()->points_balance,
                'note' => 'Earned from confirmed booking',
                'created_at' => now(),
            ]);
        });
    }

    /**
     * Compensating entry when a confirmed booking that already earned
     * points is later cancelled/refunded — self-corrects the balance
     * without needing a cron sweep.
     */
    public function reverseForBooking(User $user, ?int $bookingId = null, ?int $packageBookingId = null): void
    {
        $query = LoyaltyTransaction::where('user_id', $user->id)->where('type', LoyaltyTransaction::TYPE_EARN);
        $earnTx = $bookingId
            ? $query->where('booking_id', $bookingId)->first()
            : $query->where('package_booking_id', $packageBookingId)->first();

        if (!$earnTx) return;

        DB::transaction(function () use ($user, $earnTx, $bookingId, $packageBookingId) {
            $account = LoyaltyAccount::where('user_id', $user->id)->lockForUpdate()->first();
            if (!$account) return;

            $reversal = min($earnTx->points, $account->points_balance);
            if ($reversal <= 0) return;

            $account->decrement('points_balance', $reversal);

            LoyaltyTransaction::create([
                'user_id' => $user->id,
                'type' => LoyaltyTransaction::TYPE_EXPIRE,
                'points' => -$reversal,
                'booking_id' => $bookingId,
                'package_booking_id' => $packageBookingId,
                'balance_after' => $account->fresh()->points_balance,
                'note' => 'Reversed — booking cancelled/refunded',
                'created_at' => now(),
            ]);
        });
    }

    /**
     * Redeem points toward a discount, returning the dollar discount
     * amount. Caller is responsible for applying it to the order.
     */
    public function redeem(User $user, int $points, ?int $bookingId, ?int $packageBookingId): array
    {
        if ($points <= 0) {
            return ['success' => false, 'message' => 'Enter a positive number of points.', 'discount_amount' => 0];
        }

        $account = LoyaltyAccount::where('user_id', $user->id)->lockForUpdate()->first();
        if (!$account || $account->points_balance < $points) {
            return ['success' => false, 'message' => 'You do not have enough points.', 'discount_amount' => 0];
        }

        $discountAmount = round($points / $this->pointsPerDollar(), 2);

        DB::transaction(function () use ($account, $points, $user, $bookingId, $packageBookingId) {
            $account->decrement('points_balance', $points);
            $account->increment('lifetime_points_redeemed', $points);

            LoyaltyTransaction::create([
                'user_id' => $user->id,
                'type' => LoyaltyTransaction::TYPE_REDEEM,
                'points' => -$points,
                'booking_id' => $bookingId,
                'package_booking_id' => $packageBookingId,
                'balance_after' => $account->fresh()->points_balance,
                'note' => 'Redeemed at checkout',
                'created_at' => now(),
            ]);
        });

        return ['success' => true, 'message' => 'Points redeemed.', 'discount_amount' => $discountAmount];
    }

    public function adjust(User $user, int $points, string $note, User $admin): LoyaltyAccount
    {
        $account = $this->account($user);

        DB::transaction(function () use ($account, $points, $note, $user, $admin) {
            $account->increment('points_balance', $points);
            if ($points > 0) {
                $account->increment('lifetime_points_earned', $points);
            }

            LoyaltyTransaction::create([
                'user_id' => $user->id,
                'type' => LoyaltyTransaction::TYPE_ADJUST,
                'points' => $points,
                'balance_after' => $account->fresh()->points_balance,
                'note' => $note,
                'created_by' => $admin->id,
                'created_at' => now(),
            ]);
        });

        return $account->fresh();
    }
}
