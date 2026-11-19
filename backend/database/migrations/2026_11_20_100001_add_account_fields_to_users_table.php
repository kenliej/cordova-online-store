<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Account/profile fields for the users table (docs/BACKEND_ARCHITECTURE.md §4.1).
 *
 * The default Laravel users migration (0001_01_01_000000) is not modified.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->unique();
            $table->enum('role', ['admin', 'worker', 'customer'])->default('customer');
            $table->enum('status', ['pending', 'active', 'rejected', 'removed', 'banned'])->default('pending');
            $table->string('customer_no', 12)->nullable()->unique();
            $table->string('worker_no', 12)->nullable()->unique();
            $table->string('gender', 40)->nullable();
            $table->date('birthday')->nullable();
            $table->string('address', 255)->nullable();
            $table->string('profile_photo_path', 255)->nullable();
            $table->unsignedTinyInteger('bad_records')->default(0);
            // Stores are owned by the catalog module; the FK is added by a later
            // migration only when the stores table exists (see 2026_11_20_199999).
            $table->unsignedBigInteger('store_id')->nullable()->index();
            $table->timestamp('last_login_at')->nullable()->index();

            $table->index(['role', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role', 'status']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['store_id']);
            $table->dropIndex(['last_login_at']);
            $table->dropColumn([
                'phone',
                'role',
                'status',
                'customer_no',
                'worker_no',
                'gender',
                'birthday',
                'address',
                'profile_photo_path',
                'bad_records',
                'store_id',
                'last_login_at',
            ]);
        });
    }
};
