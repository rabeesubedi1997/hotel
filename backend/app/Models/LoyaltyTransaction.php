<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    const TYPE_EARN = 'earn';
    const TYPE_REDEEM = 'redeem';
    const TYPE_EXPIRE = 'expire';
    const TYPE_ADJUST = 'adjust';

    protected $fillable = [
        'user_id',
        'type',
        'points',
        'booking_id',
        'package_booking_id',
        'balance_after',
        'note',
        'created_by',
    ];

    protected $casts = [
        'points' => 'integer',
        'balance_after' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function packageBooking(): BelongsTo
    {
        return $this->belongsTo(PackageBooking::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
