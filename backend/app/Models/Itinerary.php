<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Itinerary extends Model
{
    use HasFactory, SoftDeletes;

    const TYPE_CURATED = 'curated';
    const TYPE_PERSONAL = 'personal';

    const STATUS_DRAFT = 'draft';
    const STATUS_PUBLISHED = 'published';

    const APPROVAL_STATUS_PENDING = 'pending';
    const APPROVAL_STATUS_APPROVED = 'approved';
    const APPROVAL_STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'title',
        'slug',
        'description',
        'cover_image',
        'type',
        'user_id',
        'is_public',
        'status',
        'duration_days',
        'price_from',
        'fixed_price',
        'max_travelers',
        'approval_status',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'is_public' => 'boolean',
        'duration_days' => 'integer',
        'price_from' => 'decimal:2',
        'fixed_price' => 'decimal:2',
        'max_travelers' => 'integer',
        'approved_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Itinerary $itinerary) {
            if (empty($itinerary->slug)) {
                $itinerary->slug = static::generateUniqueSlug($itinerary->title);
            }
        });
    }

    protected static function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'itinerary';
        $slug = $base;
        $suffix = 1;

        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $suffix++;
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function items(): HasMany
    {
        return $this->hasMany(ItineraryItem::class)->orderBy('day_number')->orderBy('sort_order');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function packageBookings(): HasMany
    {
        return $this->hasMany(PackageBooking::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeCurated($query)
    {
        return $query->where('type', self::TYPE_CURATED);
    }

    public function scopePersonal($query)
    {
        return $query->where('type', self::TYPE_PERSONAL);
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    public function scopePubliclyVisible($query)
    {
        return $query->curated()
            ->published()
            ->where('is_public', true)
            ->where('approval_status', self::APPROVAL_STATUS_APPROVED);
    }
}
