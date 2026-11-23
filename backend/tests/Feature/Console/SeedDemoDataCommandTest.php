<?php

namespace Tests\Feature\Console;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeedDemoDataCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_demo_data_when_the_database_is_empty(): void
    {
        $this->assertDatabaseCount('users', 0);

        $this->artisan('app:seed-demo', ['--force' => true])
            ->assertSuccessful();

        $this->assertGreaterThan(0, User::query()->count());
        $this->assertDatabaseHas('users', ['email' => 'admin@gaisano-cordova.com']);
        $this->assertDatabaseHas('users', ['email' => 'customer@gaisano-cordova.com']);
    }

    public function test_it_is_idempotent_and_does_not_duplicate_demo_data(): void
    {
        $this->artisan('app:seed-demo', ['--force' => true])->assertSuccessful();
        $users = User::query()->count();
        $orders = Order::query()->count();
        $this->assertGreaterThan(0, $users);
        $this->assertGreaterThan(0, $orders);

        $this->artisan('app:seed-demo', ['--force' => true])
            ->expectsOutputToContain('already present')
            ->assertSuccessful();

        $this->assertSame($users, User::query()->count());
        $this->assertSame($orders, Order::query()->count());
    }

    public function test_it_refuses_to_seed_production_without_force(): void
    {
        app()->detectEnvironment(static fn () => 'production');

        try {
            $this->artisan('app:seed-demo')
                ->expectsOutputToContain('refusing')
                ->assertFailed();
        } finally {
            app()->detectEnvironment(static fn () => 'testing');
        }

        $this->assertDatabaseCount('users', 0);
    }
}
