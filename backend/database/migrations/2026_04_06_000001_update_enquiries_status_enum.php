<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->enum('status', ['new', 'in_progress', 'responded', 'resolved', 'closed'])->default('new')->change();
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->enum('status', ['new', 'in_progress', 'resolved', 'closed'])->default('new')->change();
        });
    }
};
