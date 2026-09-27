<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ItineraryItem extends Model
{
    use HasFactory;

    // Friendly type strings accepted/returned over the API, mapped to their
    // fully qualified model class for the polymorphic bookable_type column
    // — same convention BookingController uses for Booking::bookable.
    const TYPE_MAP = [
        'hotel' => Hotel::class,
        'activity' => Activity::class,
        'tour_guide' => TourGuide::class,
    ];

    protected $fillable = [
        'itinerary_id',
        'bookable_type',
        'bookable_id',
        'day_number',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'day_number' => 'integer',
        'sort_order' => 'integer',
    ];

    protected $appends = ['bookable_label'];

    public function itinerary(): BelongsTo
    {
        return $this->belongsTo(Itinerary::class);
    }

    public function bookable(): MorphTo
    {
        return $this->morphTo();
    }

    public function getBookableLabelAttribute(): ?string
    {
        return array_search($this->bookable_type, self::TYPE_MAP) ?: null;
    }

    public static function classForType(string $friendlyType): ?string
    {
        return self::TYPE_MAP[$friendlyType] ?? null;
    }
}
