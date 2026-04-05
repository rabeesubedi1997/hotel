<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        User::create([
            'name' => 'System Admin',
            'email' => 'admin@reservenow.com',
            'password' => Hash::make('password123'),
            'phone' => '9800000001',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
            'address' => 'Thamel, Kathmandu',
            'city' => 'Kathmandu',
        ]);

        // Manager user
        User::create([
            'name' => 'Hotel Manager',
            'email' => 'manager@reservenow.com',
            'password' => Hash::make('password123'),
            'phone' => '9800000002',
            'role' => User::ROLE_MANAGER,
            'status' => User::STATUS_ACTIVE,
            'address' => 'Lakeside, Pokhara',
            'city' => 'Pokhara',
        ]);

        // Customer users
        $customers = [
            [
                'name' => 'John Doe',
                'email' => 'john.doe@email.com',
                'phone' => '9800000003',
                'city' => 'Kathmandu',
            ],
            [
                'name' => 'Jane Smith',
                'email' => 'jane.smith@email.com',
                'phone' => '9800000004',
                'city' => 'Pokhara',
            ],
            [
                'name' => 'Raj Sharma',
                'email' => 'raj.sharma@email.com',
                'phone' => '9800000005',
                'city' => 'Biratnagar',
            ],
            [
                'name' => 'Sita Gurung',
                'email' => 'sita.gurung@email.com',
                'phone' => '9800000006',
                'city' => 'Pokhara',
            ],
            [
                'name' => 'Michael Brown',
                'email' => 'michael.brown@email.com',
                'phone' => '9800000007',
                'city' => 'Lalitpur',
            ],
        ];

        foreach ($customers as $customer) {
            User::create([
                'name' => $customer['name'],
                'email' => $customer['email'],
                'password' => Hash::make('password123'),
                'phone' => $customer['phone'],
                'role' => User::ROLE_CUSTOMER,
                'status' => User::STATUS_ACTIVE,
                'city' => $customer['city'],
            ]);
        }
    }
}
