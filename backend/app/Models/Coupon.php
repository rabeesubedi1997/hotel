<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    use HasFactory;

    const TYPE_FLAT = 'flat';
    const TYPE_PERCENT = 'percent';

    const SCOPE_ALL = 'all';
    const SCOPE_HOTELS = 'hotels';
    const SCOPE_ACTIVITIES = 'activities';
    const SCOPE_PACKAGES = 'packages';
    const SCOPE_TOUR_GUIDES = 'tour_guides';

    protected $fillable = [
        'code',
        'description',
        'type',
        'value',
        'max_discount_amount',
        'min_order_amount',
        'applicable_to',
        'usage_limit',
        'usage_limit_per_user',
        'valid_from',
        'valid_until',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'usage_limit' => 'integer',
        'usage_limit_per_user' => 'integer',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Coupon $coupon) {
            $coupon->code = strtoupper($coupon->code);
        });
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
