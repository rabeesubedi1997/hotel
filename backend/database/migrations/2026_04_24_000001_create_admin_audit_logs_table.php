<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();

            // Who performed the action — always an admin/manager/super_admin,
            // never null (every logged action has an authenticated actor).
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();

            // Whose data was viewed/affected, when applicable (e.g. viewing
            // or editing a specific vendor's or customer's records). Null
            // for actions with no single "owning" user.
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('action'); // e.g. 'view', 'update', 'delete', 'status_change'
            $table->string('subject_type')->nullable(); // e.g. 'Hotel', 'Activity', 'Booking', 'User'
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_user_id', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
    }
};
