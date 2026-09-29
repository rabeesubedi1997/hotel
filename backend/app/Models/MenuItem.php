<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'hotel_id',
        'activity_id',
        'name',
        'description',
        'price',
        'cost_price',
        'category',
        'sku',
        'station',
        'allergens',
        'prep_time_minutes',
        'image',
        'is_available',
        'stock_quantity',
        'low_stock_threshold',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'is_available' => 'boolean',
        'allergens' => 'array',
    ];

    protected $appends = ['margin_percent'];

    public function getMarginPercentAttribute(): ?float
    {
        return $this->marginPercent();
    }

    public function isLowStock(): bool
    {
        return $this->stock_quantity !== null && $this->stock_quantity <= $this->low_stock_threshold;
    }

    public function marginPercent(): ?float
    {
        if ($this->cost_price === null || (float) $this->price <= 0) {
            return null;
        }

        return round((((float) $this->price - (float) $this->cost_price) / (float) $this->price) * 100, 1);
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }
}
