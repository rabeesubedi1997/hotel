<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetAdminPassword extends Command
{
    protected $signature = 'app:reset-admin-password';
    protected $description = 'Reset admin password to password123';

    public function handle(): void
    {
        $user = User::where('email', 'admin@reservenow.com')->first();
        
        if (!$user) {
            $this->error('Admin user not found');
            return;
        }

        $user->password = Hash::make('password123');
        $user->status = User::STATUS_ACTIVE;
        $user->save();

        $this->info('Admin password reset successfully!');
        $this->info('Email: admin@reservenow.com');
        $this->info('Password: password123');
    }
}
