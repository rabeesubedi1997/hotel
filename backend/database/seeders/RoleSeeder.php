<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Super Admin',
                'slug' => 'super_admin',
                'description' => 'Full system access with user management capabilities',
                'level' => 100,
                'permissions' => [
                    // Hotel Management
                    'hotels.view.all',
                    'hotels.create',
                    'hotels.edit.all',
                    'hotels.delete.all',
                    'hotels.approve',
                    
                    // Activity Management
                    'activities.view.all',
                    'activities.create',
                    'activities.edit.all',
                    'activities.delete.all',
                    'activities.approve',
                    
                    // Booking Management
                    'bookings.view.all',
                    'bookings.create',
                    'bookings.edit.all',
                    'bookings.cancel.all',
                    'bookings.manage',
                    
                    // User Management
                    'users.view.all',
                    'users.create',
                    'users.edit.all',
                    'users.delete.all',
                    'users.assign_roles',
                    
                    // Media Management
                    'media.view.all',
                    'media.upload',
                    'media.delete.all',
                    
                    // System Management
                    'system.settings',
                    'system.reports',
                    'system.analytics',
                    'admin.dashboard.access',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'Admin',
                'slug' => 'admin',
                'description' => 'Administrative access to manage content and users',
                'level' => 80,
                'permissions' => [
                    // Hotel Management
                    'hotels.view.all',
                    'hotels.create',
                    'hotels.edit.all',
                    'hotels.delete.all',
                    'hotels.approve',
                    
                    // Activity Management
                    'activities.view.all',
                    'activities.create',
                    'activities.edit.all',
                    'activities.delete.all',
                    'activities.approve',
                    
                    // Booking Management
                    'bookings.view.all',
                    'bookings.create',
                    'bookings.edit.all',
                    'bookings.cancel.all',
                    'bookings.manage',
                    
                    // User Management (limited)
                    'users.view.all',
                    'users.create',
                    'users.edit.limited',
                    'users.delete.limited',
                    
                    // Media Management
                    'media.view.all',
                    'media.upload',
                    'media.delete.all',
                    
                    // Reports
                    'system.reports',
                    'system.analytics',
                    'admin.dashboard.access',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'Manager',
                'slug' => 'manager',
                'description' => 'Limited management access to assigned content',
                'level' => 60,
                'permissions' => [
                    // Hotel Management (assigned only)
                    'hotels.view.assigned',
                    'hotels.create',
                    'hotels.edit.assigned',
                    'hotels.delete.assigned',
                    
                    // Activity Management (assigned only)
                    'activities.view.assigned',
                    'activities.create',
                    'activities.edit.assigned',
                    'activities.delete.assigned',
                    
                    // Booking Management (assigned only)
                    'bookings.view.assigned',
                    'bookings.edit.assigned',
                    'bookings.cancel.assigned',
                    
                    // Media Management
                    'media.view.assigned',
                    'media.upload',
                    'media.delete.assigned',
                    
                    'admin.dashboard.access',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'Vendor',
                'slug' => 'vendor',
                'description' => 'Can manage own hotels, activities, and bookings',
                'level' => 40,
                'permissions' => [
                    // Hotel Management (own only)
                    'hotels.view.own',
                    'hotels.create',
                    'hotels.edit.own',
                    'hotels.delete.own',
                    
                    // Activity Management (own only)
                    'activities.view.own',
                    'activities.create',
                    'activities.edit.own',
                    'activities.delete.own',
                    
                    // Booking Management (own only)
                    'bookings.view.own',
                    'bookings.edit.own',
                    'bookings.cancel.own',
                    
                    // Media Management (own only)
                    'media.view.own',
                    'media.upload',
                    'media.delete.own',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'Customer',
                'slug' => 'customer',
                'description' => 'Can browse, book, and manage own bookings',
                'level' => 20,
                'permissions' => [
                    // Viewing
                    'hotels.view.public',
                    'activities.view.public',
                    
                    // Booking
                    'bookings.create',
                    'bookings.view.own',
                    'bookings.cancel.own',
                    
                    // Reviews
                    'reviews.create',
                    'reviews.edit.own',
                    'reviews.delete.own',
                    
                    // Wishlist
                    'wishlist.create',
                    'wishlist.view.own',
                    'wishlist.delete.own',
                ],
                'is_active' => true,
            ],
        ];

        foreach ($roles as $role) {
            Role::create($role);
        }
    }
}
