<?php

namespace App\Models;

use App\Models\Concerns\BelongsToRestaurantOwner;
use Illuminate\Database\Eloquent\Model;

class MenuCategory extends Model
{
    use BelongsToRestaurantOwner;

    protected $fillable = [
        'owner_id',
        'owner_type',
        'name',
        'sort_order',
    ];
}
