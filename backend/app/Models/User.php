<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    const ROLE_SUPER_ADMIN = 'super_admin';
    const ROLE_ADMIN = 'admin';
    const ROLE_MANAGER = 'manager';
    const ROLE_VENDOR = 'vendor';
    const ROLE_CUSTOMER = 'customer';

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_SUSPENDED = 'suspended';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'email',
        'password',
        'phone',
        'company_name',
        'bio',
        'avatar',
        'cover_image',
        'address',
        'city',
        'role',
        'status',
        'is_guest',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_guest' => 'boolean',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (User $user) {
            if ($user->role === self::ROLE_VENDOR && empty($user->slug)) {
                $user->slug = static::generateUniqueSlug($user->company_name ?: $user->name);
            }
        });
    }

    protected static function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'vendor';
        $slug = $base;
        $suffix = 1;

        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $suffix++;
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }

    /**
     * Roles that belong to the user
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    /**
     * Get user's primary role (from role column for backward compatibility)
     */
    public function getPrimaryRole(): ?Role
    {
        return Role::where('slug', $this->role)->first();
    }

    /**
     * Get all user permissions from all roles
     */
    public function getAllPermissions(): array
    {
        $permissions = [];
        
        // Get permissions from primary role (backward compatibility)
        $primaryRole = $this->getPrimaryRole();
        if ($primaryRole && $primaryRole->permissions) {
            $permissions = array_merge($permissions, $primaryRole->permissions);
        }
        
        // Get permissions from additional roles
        foreach ($this->roles as $role) {
            if ($role->permissions) {
                $permissions = array_merge($permissions, $role->permissions);
            }
        }
        
        return array_unique($permissions);
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->getAllPermissions());
    }

    /**
     * Check if user has any of the given permissions
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user can access a specific feature
     */
    public function canAccess(string $feature, string $scope = 'own'): bool
    {
        $permission = "{$feature}.{$scope}";
        
        // Check specific permission first
        if ($this->hasPermission($permission)) {
            return true;
        }
        
        // Check broader permissions
        if ($this->hasPermission("{$feature}.all")) {
            return true;
        }
        
        // Check assigned permissions for managers
        if ($this->hasPermission("{$feature}.assigned")) {
            return true;
        }
        
        return false;
    }

    /**
     * Assign a role to user
     */
    public function assignRole(Role|string $role): void
    {
        if (is_string($role)) {
            $role = Role::where('slug', $role)->firstOrFail();
        }
        
        if (!$this->roles()->where('role_id', $role->id)->exists()) {
            $this->roles()->attach($role->id);
        }
    }

    /**
     * Remove a role from user
     */
    public function removeRole(Role|string $role): void
    {
        if (is_string($role)) {
            $role = Role::where('slug', $role)->firstOrFail();
        }
        
        $this->roles()->detach($role->id);
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole(string $role): bool
    {
        // Check primary role first (backward compatibility)
        if ($this->role === $role) {
            return true;
        }
        
        // Check additional roles
        return $this->roles()->where('slug', $role)->exists();
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function tripPlans(): HasMany
    {
        return $this->hasMany(Itinerary::class)->where('type', Itinerary::TYPE_PERSONAL);
    }

    public function hotels(): HasMany
    {
        // Hotel::user_id is the actual owner column written by
        // Vendor\HotelController — hotels also has a separate, unused
        // vendor_id column from an earlier migration; don't use it here.
        return $this->hasMany(Hotel::class, 'user_id');
    }

    public function activities(): HasMany
    {
        // See hotels() above — Activity::user_id is the column actually
        // written by Vendor\ActivityController.
        return $this->hasMany(Activity::class, 'user_id');
    }

    public function tourGuides(): HasMany
    {
        return $this->hasMany(TourGuide::class, 'vendor_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isManager(): bool
    {
        return $this->role === self::ROLE_MANAGER;
    }

    public function isVendor(): bool
    {
        return $this->role === self::ROLE_VENDOR;
    }

    public function isCustomer(): bool
    {
        return $this->role === self::ROLE_CUSTOMER;
    }

    /**
     * Check if user is admin level (admin, manager, super_admin)
     */
    public function isAdminLevel(): bool
    {
        return $this->isSuperAdmin() || $this->isAdmin() || $this->isManager();
    }

    /**
     * Check if user can access admin dashboard
     */
    public function canAccessAdminDashboard(): bool
    {
        return $this->hasPermission('admin.dashboard.access') || $this->isAdminLevel();
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
