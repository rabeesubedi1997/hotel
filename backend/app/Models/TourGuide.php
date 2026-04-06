<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TourGuide extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'image',
        'role',
        'bio',
        'trips_completed',
        'rating',
        'total_reviews',
        'is_available_for_hire',
        'hire_price_per_day',
        'languages',
        'specialties',
        'certifications',
        'phone',
        'email',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'trips_completed' => 'integer',
        'rating' => 'decimal:1',
        'total_reviews' => 'integer',
        'is_available_for_hire' => 'boolean',
        'hire_price_per_day' => 'decimal:2',
        'languages' => 'array',
        'specialties' => 'array',
        'certifications' => 'array',
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($guide) {
            if (empty($guide->slug)) {
                $guide->slug = Str::slug($guide->name);
            }
        });

        static::updating(function ($guide) {
            if ($guide->isDirty('name') && empty($guide->slug)) {
                $guide->slug = Str::slug($guide->name);
            }
        });
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(TourGuideBooking::class);
    }

    public function getDefaultImageAttribute(): string
    {
        return $this->image ?: 'https://ui-avatars.com/api/?name=' . urlencode($this->name) . '&size=256&background=0D9488&color=fff';
    }

    public function getStarRatingAttribute(): string
    {
        $rating = (float) $this->rating;
        $fullStars = floor($rating);
        $halfStar = ($rating - $fullStars) >= 0.5;
        $emptyStars = 5 - $fullStars - ($halfStar ? 1 : 0);

        $stars = str_repeat('★', $fullStars);
        if ($halfStar) $stars .= '½';
        $stars .= str_repeat('☆', $emptyStars);

        return $stars;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAvailable($query)
    {
        return $query->where('is_available_for_hire', true)->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name');
    }
}
