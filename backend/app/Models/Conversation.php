<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Conversation extends Model
{
    use HasFactory;

    const TYPE_VENDOR_INQUIRY = 'vendor_inquiry';
    const TYPE_SUPPORT = 'support';

    protected $fillable = [
        'type',
        'customer_id',
        'vendor_id',
        'subject_type',
        'subject_id',
        'last_message_at',
    ];

    protected $casts = [
        'vendor_id' => 'integer',
        'customer_id' => 'integer',
        'last_message_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /**
     * True if $user is allowed to see/participate in this conversation:
     * the customer, the specific vendor (for vendor_inquiry), or any
     * admin-level user (for support conversations).
     */
    public function isParticipant(User $user): bool
    {
        if ($this->customer_id === $user->id) {
            return true;
        }

        if ($this->type === self::TYPE_VENDOR_INQUIRY) {
            return $this->vendor_id === $user->id;
        }

        return $user->isAdminLevel();
    }

    /**
     * The other side of the conversation from $sender's perspective —
     * used to decide who gets notified of a new message. For a support
     * conversation where the sender is the customer, this returns null
     * (recipients are "all admins", handled separately by the caller).
     */
    public function otherParticipant(User $sender): ?User
    {
        if ($sender->id === $this->customer_id) {
            return $this->type === self::TYPE_VENDOR_INQUIRY ? $this->vendor : null;
        }

        return $this->customer;
    }
}
