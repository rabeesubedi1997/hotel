<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourGuideBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'tour_guide_id',
        'user_id',
        'booking_date',
        'duration_days',
        'message',
        'status',
        'total_price',
        'admin_notes',
        'confirmed_at',
        'completed_at',
    ];

    protected $casts = [
        'booking_date' => 'date',
        'duration_days' => 'integer',
        'total_price' => 'decimal:2',
        'confirmed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function tourGuide(): BelongsTo
    {
        return $this->belongsTo(TourGuide::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function generateBookingNumber(): string
    {
        return 'TG-' . strtoupper(uniqid());
    }
}
