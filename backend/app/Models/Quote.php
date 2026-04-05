<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Quote extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'quote_number',
        'name',
        'email',
        'phone',
        'package_type',
        'duration_days',
        'travelers',
        'start_date',
        'requirements',
        'preferred_activities',
        'preferred_hotels',
        'estimated_budget',
        'quoted_amount',
        'admin_notes',
        'status',
        'quoted_at',
        'expires_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'quoted_at' => 'datetime',
        'expires_at' => 'datetime',
        'estimated_budget' => 'decimal:2',
        'quoted_amount' => 'decimal:2',
        'preferred_activities' => 'array',
        'preferred_hotels' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($quote) {
            if (empty($quote->quote_number)) {
                $quote->quote_number = 'QT-' . strtoupper(uniqid());
            }
        });
    }
}
