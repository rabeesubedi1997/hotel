<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    const METHOD_KHALTI = 'khalti';
    const METHOD_STRIPE = 'stripe';
    const METHOD_PAYPAL = 'paypal';
    const METHOD_CASH = 'cash';
    const METHOD_BANK_TRANSFER = 'bank_transfer';

    const STATUS_PENDING = 'pending';
    const STATUS_INITIATED = 'initiated';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_REFUNDED = 'refunded';
    const STATUS_PARTIALLY_REFUNDED = 'partially_refunded';

    protected $fillable = [
        'booking_id',
        'method',
        'transaction_id',
        'payment_intent_id',
        'amount',
        'currency',
        'status',
        'response_data',
        'request_data',
        'paid_at',
        'refunded_at',
    ];

    protected $casts = [
        'response_data' => 'array',
        'request_data' => 'array',
        'paid_at' => 'datetime',
        'refunded_at' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isRefunded(): bool
    {
        return in_array($this->status, [self::STATUS_REFUNDED, self::STATUS_PARTIALLY_REFUNDED]);
    }
}
