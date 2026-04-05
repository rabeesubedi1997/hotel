<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hotel extends Model
{
    use HasFactory, SoftDeletes;

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_MAINTENANCE = 'maintenance';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'address',
        'city',
        'district',
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
    ];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
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
}
