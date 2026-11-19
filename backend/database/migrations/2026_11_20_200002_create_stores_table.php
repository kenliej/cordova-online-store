<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug')->unique();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->text('description')->nullable();
            $table->string('operating_hours', 60)->default('6:00AM - 11:00PM');
            $table->string('phone', 20);
            // Absolute https URL (seeded demo data) or a storage-relative path.
            $table->string('image_path')->nullable();
            $table->boolean('is_open')->default(true);
            $table->string('floor_location', 120)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['is_open', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
