<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Promotion extends Model
{
    use HasFactory;

    // Placement slots the frontend knows how to render. Kept as a plain
    // string column (not an enum) so new slots can be added without a
    // migration, but this list is what the admin UI offers.
    const PLACEMENT_HOME_HERO = 'home_hero';
    const PLACEMENT_HOME_STRIP = 'home_strip';
    const PLACEMENT_LISTING_SIDEBAR = 'listing_sidebar';

    const PLACEMENTS = [
        self::PLACEMENT_HOME_HERO,
        self::PLACEMENT_HOME_STRIP,
        self::PLACEMENT_LISTING_SIDEBAR,
    ];

    protected $fillable = [
        'title',
        'subtitle',
        'image',
        'cta_text',
        'cta_link',
        'placement',
        'is_active',
        'starts_at',
        'ends_at',
        'display_order',
        'click_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'display_order' => 'integer',
        'click_count' => 'integer',
    ];

    public function scopeActive(Builder $query): Builder
    {
        $now = now();

        return $query->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            });
    }

    public function scopeForPlacement(Builder $query, string $placement): Builder
    {
        return $query->where('placement', $placement);
    }
}
