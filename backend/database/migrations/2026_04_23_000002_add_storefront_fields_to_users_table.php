<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Models\User;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name');
            $table->text('bio')->nullable()->after('company_name');
            $table->string('cover_image')->nullable()->after('avatar');
        });

        // Backfill slugs for existing vendors so their public storefront
        // URL (/vendors/{slug}) works immediately without a manual edit.
        User::where('role', 'vendor')->whereNull('slug')->each(function (User $user) {
            $base = Str::slug($user->company_name ?: $user->name) ?: 'vendor';
            $slug = $base;
            $suffix = 1;
            while (User::where('slug', $slug)->where('id', '!=', $user->id)->exists()) {
                $suffix++;
                $slug = "{$base}-{$suffix}";
            }
            $user->update(['slug' => $slug]);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['slug', 'bio', 'cover_image']);
        });
    }
};
