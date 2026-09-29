<?php

namespace App\Models;

use App\Models\Concerns\HasRestaurantPos;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hotel extends Model
{
    use HasFactory, SoftDeletes, HasRestaurantPos;

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_MAINTENANCE = 'maintenance';

    const APPROVAL_STATUS_PENDING = 'pending';
    const APPROVAL_STATUS_APPROVED = 'approved';
    const APPROVAL_STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'name',
        'slug',
        'user_id',
        'description',
        'address',
        'city',
        'district',
        'latitude',
        'longitude',
        'price_per_night',
        'rating',
        'star_rating',
        'amenities',
        'images',
        'featured_image',
        'is_featured',
        'show_in_banner',
        'banner_order',
        'status',
        'approval_status',
        'stock_deduction_mode',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'phone',
        'email',
        'policies',
        'google_rating',
        'google_review_count',
        'tripadvisor_rating',
        'tripadvisor_review_count',
    ];

    protected $casts = [
        'amenities' => 'array',
        'images' => 'array',
        'price_per_night' => 'decimal:2',
        'rating' => 'decimal:1',
        'google_rating' => 'decimal:1',
        'tripadvisor_rating' => 'decimal:1',
        'is_featured' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeApproved($query)
    {
        return $query->where('approval_status', self::APPROVAL_STATUS_APPROVED);
    }

    public function scopePending($query)
    {
        return $query->where('approval_status', self::APPROVAL_STATUS_PENDING);
    }

    public function scopeRejected($query)
    {
        return $query->where('approval_status', self::APPROVAL_STATUS_REJECTED);
    }

    public function bookings(): MorphMany
    {
        return $this->morphMany(Booking::class, 'bookable');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    public function wishlists(): MorphMany
    {
        return $this->morphMany(Wishlist::class, 'wishlistable');
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true)->where('status', self::STATUS_ACTIVE);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopeNearLocation($query, $latitude, $longitude, $radiusInKm = 50)
    {
        $haversine = "(6371 * acos(cos(radians(?)) 
                        * cos(radians(latitude)) 
                        * cos(radians(longitude) - radians(?)) 
                        + sin(radians(?)) 
                        * sin(radians(latitude))))";

        return $query->selectRaw("*, {$haversine} AS distance", [$latitude, $longitude, $latitude])
                     ->having('distance', '<', $radiusInKm)
                     ->orderBy('distance');
    }
}
