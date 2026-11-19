<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Demo data for local development and the Docker stack.
 *
 * Order matters: users first (accounts), then catalog (stores/products),
 * then commerce (orders/notifications), which references both.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CatalogSeeder::class,
            CommerceSeeder::class,
        ]);
    }
}
