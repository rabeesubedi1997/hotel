<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enquiry extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'enquiry_number',
        'name',
        'email',
        'phone',
        'type',
        'subject',
        'message',
        'related_items',
        'status',
        'admin_response',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
        'related_items' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($enquiry) {
            if (empty($enquiry->enquiry_number)) {
                $enquiry->enquiry_number = 'ENQ-' . strtoupper(uniqid());
            }
        });
    }
}
