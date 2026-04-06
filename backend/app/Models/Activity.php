<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Activity extends Model
{
    use HasFactory, SoftDeletes;

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_SEASONAL = 'seasonal';

    const TYPE_BUNGEE = 'bungee';
    const TYPE_PARAGLIDING = 'paragliding';
    const TYPE_RAFTING = 'rafting';
    const TYPE_TREKKING = 'trekking';
    const TYPE_ZIPLINE = 'zipline';
    const TYPE_SKYDIVING = 'skydiving';
    const TYPE_CANYONING = 'canyoning';
    const TYPE_ROCK_CLIMBING = 'rock_climbing';
    const TYPE_HOT_AIR_BALLOON = 'hot_air_balloon';
    const TYPE_OTHER = 'other';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'type',
        'location',
        'city',
        'latitude',
        'longitude',
        'duration',
        'price',
        'max_participants',
        'difficulty_level',
        'includes',
        'images',
        'featured_image',
        'is_featured',
        'show_in_banner',
        'banner_order',
        'status',
        'requirements',
        'safety_info',
        'google_rating',
        'google_review_count',
        'tripadvisor_rating',
        'tripadvisor_review_count',
    ];

    protected $casts = [
        'includes' => 'array',
        'images' => 'array',
        'price' => 'decimal:2',
        'rating' => 'decimal:1',
        'google_rating' => 'decimal:1',
        'tripadvisor_rating' => 'decimal:1',
        'is_featured' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function bookings(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Booking::class, 'bookable');
    }

    public function reviews(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    public function wishlists(): \Illuminate\Database\Eloquent\Relations\MorphMany
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
}
