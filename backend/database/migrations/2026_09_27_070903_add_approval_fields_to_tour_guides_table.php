<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tour_guides', function (Blueprint $table) {
            // Defaults to 'approved' (not 'pending' like Hotel/Activity) so
            // existing admin-created guides stay publicly visible without a
            // data migration — only guides created through the new vendor
            // self-service controller get created with 'pending' explicitly.
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('approved')->after('vendor_id');
            $table->foreignId('approved_by')->nullable()->after('approval_status')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tour_guides', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['approval_status', 'approved_by', 'approved_at', 'rejection_reason']);
        });
    }
};
