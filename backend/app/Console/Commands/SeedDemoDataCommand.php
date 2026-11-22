<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

/**
 * Safe demo seeding for local / Docker development.
 *
 * The regular `db:seed` is intentionally run once (seeders create demo orders).
 * This command makes the Docker/local bootstrap idempotent: it seeds only when
 * the database has no users yet, so it can run on every `docker compose up`.
 */
class SeedDemoDataCommand extends Command
{
    protected $signature = 'app:seed-demo
                            {--force : Allow seeding when APP_ENV=production (Docker default)}';

    protected $description = 'Seed demo data only when the database has no users (local/dev helper)';

    public function handle(): int
    {
        // Repair demo file permissions even when seeding is skipped: in Docker the
        // seeder can run as root (docker compose exec), which would leave the private
        // placeholder scans unreadable by the web process (www-data).
        $this->makeDemoFilesReadable();

        if (User::query()->exists()) {
            $this->info('Demo data already present (users table is not empty) - nothing to do.');

            return self::SUCCESS;
        }

        if (app()->environment('production') && ! $this->option('force')) {
            $this->warn('APP_ENV=production: refusing to seed demo accounts without --force.');

            return self::FAILURE;
        }

        $this->info('Database is empty - seeding demo data...');
        $exitCode = Artisan::call('db:seed', ['--force' => true]);
        $this->output->write(Artisan::output());
        $this->makeDemoFilesReadable();

        return $exitCode === 0 ? self::SUCCESS : self::FAILURE;
    }

    /**
     * Make storage/app/private/seed files world-readable (0644) and directories
     * traversable (0755) so php-fpm can stream the demo ID scans.
     */
    private function makeDemoFilesReadable(): void
    {
        $base = storage_path('app/private/seed');

        if (! is_dir($base)) {
            return;
        }

        @chmod($base, 0755);

        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($base, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($items as $item) {
            @chmod($item->getPathname(), $item->isDir() ? 0755 : 0644);
        }
    }
}
