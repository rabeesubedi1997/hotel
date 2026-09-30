<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class BookingCharge extends Model
{
    use HasFactory;

    const STATUS_PENDING = 'pending';
    const STATUS_POSTED = 'posted';
    const STATUS_VOIDED = 'voided';

    protected $fillable = [
        'booking_id',
        'chargeable_type',
        'chargeable_id',
        'description',
        'amount',
        'status',
        'created_by',
        'posted_at',
        'voided_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function chargeable(): MorphTo
    {
        return $this->morphTo();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePosted($query)
    {
        return $query->where('status', self::STATUS_POSTED);
    }
}
