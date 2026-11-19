<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 20)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->enum('status', ['pending', 'ready', 'claimed', 'cancelled', 'not_claimed'])->default('pending');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('total', 10, 2);
            $table->string('payment_method', 30)->default('pay_at_mall');
            $table->enum('payment_status', ['unpaid', 'paid'])->default('unpaid');
            $table->string('pickup_location', 160)->default('Online Mall Cordova - Pickup Counter');
            $table->text('notes')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('claim_deadline')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('not_claimed_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
