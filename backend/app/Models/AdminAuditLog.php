<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Records superadmin/admin oversight actions — viewing or editing a
 * specific vendor's or customer's data. Written via the static record()
 * helper from the relevant Admin\* controllers; read by Admin\AuditLogController
 * for the admin-facing audit log page.
 */
class AdminAuditLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'actor_id',
        'target_user_id',
        'action',
        'subject_type',
        'subject_id',
        'before',
        'after',
    ];

    protected $casts = [
        'before' => 'array',
        'after' => 'array',
        'created_at' => 'datetime',
    ];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Record one audit entry. $before/$after are typically the model's
     * ->getOriginal() / ->getChanges() (or a curated subset), passed as
     * plain arrays — pass null when not applicable (e.g. a 'view' action).
     */
    public static function record(
        User $actor,
        string $action,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?int $targetUserId = null,
        ?array $before = null,
        ?array $after = null
    ): void {
        static::create([
            'actor_id' => $actor->id,
            'target_user_id' => $targetUserId,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'before' => $before,
            'after' => $after,
        ]);
    }
}
