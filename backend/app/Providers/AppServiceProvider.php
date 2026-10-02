<?php

namespace App\Providers;

use App\Models\Activity;
use App\Models\Hotel;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Restaurant POS's owner_type column (see MenuItem/MenuCategory/
        // RestaurantTable/Order) stores these short aliases instead of raw
        // class strings, so renaming a model class later won't orphan
        // existing rows. This is the only morph relation in the app that
        // uses a map — bookable/reviewable/wishlistable predate it and
        // still store raw class strings. NOTE: the map also changes
        // Hotel/Activity's getMorphClass() to the alias everywhere, which
        // silently broke their bookings()/reviews()/wishlists() morphMany
        // lookups — those now use HasLegacyMorphRelations instead.
        Relation::morphMap([
            'hotel' => Hotel::class,
            'activity' => Activity::class,
        ]);
    }
}
