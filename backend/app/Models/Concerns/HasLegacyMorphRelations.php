<?php

namespace App\Models\Concerns;

use App\Models\Booking;
use App\Models\Review;
use App\Models\Wishlist;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Bookings, reviews and wishlists store the full class name
 * ("App\Models\Hotel") in their *_type column, but the Restaurant POS morph
 * map (AppServiceProvider) makes Hotel/Activity report the short alias
 * ("hotel") as their morph class. A plain morphMany() therefore searched
 * for "hotel" and found nothing — hotel pages showed no reviews and every
 * booking count read 0. These relations match either spelling, so they
 * work no matter which form a row was written with.
 */
trait HasLegacyMorphRelations
{
    private function legacyMorphMany(string $related, string $name): HasMany
    {
        return $this->hasMany($related, "{$name}_id")
            ->whereIn("{$name}_type", array_unique([static::class, $this->getMorphClass()]));
    }

    public function bookings(): HasMany
    {
        return $this->legacyMorphMany(Booking::class, 'bookable');
    }

    public function reviews(): HasMany
    {
        return $this->legacyMorphMany(Review::class, 'reviewable');
    }

    public function wishlists(): HasMany
    {
        return $this->legacyMorphMany(Wishlist::class, 'wishlistable');
    }
}
