<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Applied to MenuItem, MenuCategory, RestaurantTable, Order — the four
 * Restaurant POS tables owned by either a Hotel or an Activity — so the
 * owning relation is defined once instead of a separate hotel()/activity()
 * BelongsTo pair per model.
 */
trait BelongsToRestaurantOwner
{
    public function owner(): MorphTo
    {
        return $this->morphTo();
    }
}
