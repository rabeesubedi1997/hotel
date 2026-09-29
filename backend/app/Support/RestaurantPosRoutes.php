<?php

namespace App\Support;

use Illuminate\Support\Facades\Route;

/**
 * Restaurant POS resources (menu items, categories, tables, orders,
 * reports, inventory settings) are owned by either a Hotel or an Activity.
 * Every list/create route needs a /hotels/{hotel}/... and an
 * /activities/{activity}/... variant, differing only in URL prefix, the
 * ownerType route default, and which "own" permission is checked — this
 * generates both from one call instead of hand-writing the pair.
 */
class RestaurantPosRoutes
{
    public static function ownerScoped(string $method, string $uri, array $action, string $permissionAction): void
    {
        foreach (['hotel' => 'hotels', 'activity' => 'activities'] as $ownerType => $prefix) {
            Route::{$method}("/{$prefix}/{{$ownerType}}/{$uri}", $action)
                ->defaults('ownerType', $ownerType)
                ->middleware("permission:{$prefix}.{$permissionAction}.own");
        }
    }
}
