<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    const STATUS_PENDING = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_CHECKED_IN = 'checked_in';
    const STATUS_CHECKED_OUT = 'checked_out';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'user_id',
        'booking_number',
        'bookable_type',
        'bookable_id',
        'check_in_date',
        'check_out_date',
        'activity_datetime',
        'guests',
        'participants',
        'room_id',
        'status',
        'total_amount',
        'discount_amount',
        'special_requests',
        'cancellation_reason',
        'cancelled_at',
        'confirmed_at',
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_out_date' => 'date',
        'activity_datetime' => 'datetime',
        'cancelled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($booking) {
            $booking->booking_number = 'BK-' . strtoupper(uniqid());
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bookable(): MorphTo
    {
        return $this->morphTo();
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', [self::STATUS_CANCELLED, self::STATUS_REFUNDED]);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }
}
