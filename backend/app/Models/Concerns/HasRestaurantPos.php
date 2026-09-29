<?php

namespace App\Models\Concerns;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\RestaurantTable;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Applied to Hotel and Activity — the two model types that can own a
 * Restaurant POS setup — so the relation is defined once instead of
 * hand-duplicated on both owner models.
 */
trait HasRestaurantPos
{
    public function menuItems(): MorphMany
    {
        return $this->morphMany(MenuItem::class, 'owner');
    }

    public function menuCategories(): MorphMany
    {
        return $this->morphMany(MenuCategory::class, 'owner');
    }

    public function restaurantTables(): MorphMany
    {
        return $this->morphMany(RestaurantTable::class, 'owner');
    }

    public function orders(): MorphMany
    {
        return $this->morphMany(Order::class, 'owner');
    }
}
