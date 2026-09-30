<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurantOwner;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Grants one User Restaurant POS access scoped to one Hotel/Activity — see
 * the migration for why this exists alongside the restaurant.kitchen.*
 * permissions rather than those permissions being enough on their own.
 */
class RestaurantStaff extends Model
{
    use BelongsToRestaurantOwner;

    protected $table = 'restaurant_staff';

    protected $fillable = [
        'user_id',
        'owner_id',
        'owner_type',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
