<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use HasFactory, SoftDeletes;

    const STATUS_AVAILABLE = 'available';
    const STATUS_OCCUPIED = 'occupied';
    const STATUS_MAINTENANCE = 'maintenance';
    const STATUS_CLEANING = 'cleaning';

    protected $fillable = [
        'hotel_id',
        'room_type',
        'room_number',
        'description',
        'price',
        'capacity',
        'bed_count',
        'bed_type',
        'amenities',
        'images',
        'available_count',
        'status',
    ];

    protected $casts = [
        'amenities' => 'array',
        'images' => 'array',
        'price' => 'decimal:2',
    ];

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', self::STATUS_AVAILABLE);
    }
}
