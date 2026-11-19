<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the optional users.store_id -> stores.id foreign key.
 *
 * The stores table is created by the catalog module. This migration sorts after
 * the catalog migrations; if the table is not available yet (module in progress)
 * the constraint is skipped and store assignment still works through validation.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasTable('stores')) {
            return;
        }

        $alreadyExists = collect(Schema::getForeignKeys('users'))
            ->contains(fn (array $foreignKey): bool => in_array('store_id', $foreignKey['columns'] ?? [], true));

        if ($alreadyExists) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('store_id')->references('id')->on('stores')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['store_id']);
            });
        } catch (Throwable) {
            // Constraint was never created (stores table unavailable).
        }
    }
};
