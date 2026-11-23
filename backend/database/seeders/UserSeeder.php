<?php

namespace Database\Seeders;

use App\Models\IdDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Demo accounts for local development / the Docker stack.
 *
 * Staff (admins + workers) all use the password: admin@0912345
 *
 *   Admins:
 *     admin@gaisano-cordova.com
 *     admin-kenlie@gaisano-cordova.com
 *     admin-sherwynn@gaisano-cordova.com
 *     admin-dudes@gaisano-cordova.com
 *     admin-charlie@gaisano-cordova.com
 *
 *   Workers:
 *     worker@gaisano-cordova.com
 *     worker-kenlie@gaisano-cordova.com
 *     worker-sherwynn@gaisano-cordova.com
 *     worker-dudes@gaisano-cordova.com
 *     worker-charlie@gaisano-cordova.com
 *
 *   Customers (demo passwords unchanged, domain renamed):
 *     customer@gaisano-cordova.com / Customer#2026Secure   (active)
 *     shermaine@gaisano-cordova.com / Customer#2026Secure  (active, bad record)
 *     alex.smith@gaisano-cordova.com / Customer#2026Secure (active)
 *     pending1@gaisano-cordova.com / Customer#2026Secure   (pending, ID scans)
 *     pending2@gaisano-cordova.com / Customer#2026Secure   (pending, ID scans)
 *     removed.customer@gaisano-cordova.com / Customer#2026Secure
 *     banned.customer@gaisano-cordova.com / Customer#2026Secure
 *
 * Idempotent (updateOrCreate on the email): re-running `db:seed` keeps the same
 * demo credentials and public account numbers.
 */
class UserSeeder extends Seeder
{
    /** Shared password for every demo admin/worker account. */
    private const STAFF_PASSWORD = 'admin@0912345';

    /** 1x1 transparent PNG used as the private ID-scan placeholder. */
    private const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private const AVATAR_BASE = 'https://images.unsplash.com/';

    public function run(): void
    {
        $this->ensurePlaceholderFiles();

        $accounts = [
            // ---- administrators -------------------------------------------------
            [
                'email' => 'admin@gaisano-cordova.com',
                'name' => 'Mall Administrator',
                'password' => self::STAFF_PASSWORD,
                'role' => 'admin',
                'status' => 'active',
                'phone' => '09171000001',
                'gender' => null,
                'birthday' => '1985-04-12',
                'address' => 'Gaisano Cordova, Cordova, Cebu',
                'avatar' => 'photo-1500648767791-00dcc994a43e',
            ],
            [
                'email' => 'admin-kenlie@gaisano-cordova.com',
                'name' => 'Kenlie Administrator',
                'password' => self::STAFF_PASSWORD,
                'role' => 'admin',
                'status' => 'active',
                'phone' => '09171000002',
                'gender' => null,
                'birthday' => '1988-06-21',
                'address' => 'Cordova, Cebu',
                'avatar' => 'photo-1506794778202-cad84cf45f1d',
            ],
            [
                'email' => 'admin-sherwynn@gaisano-cordova.com',
                'name' => 'Sherwynn Administrator',
                'password' => self::STAFF_PASSWORD,
                'role' => 'admin',
                'status' => 'active',
                'phone' => '09171000003',
                'gender' => 'Real Men',
                'birthday' => '1995-09-11',
                'address' => 'Cordova, Cebu',
                'avatar' => 'photo-1534528741775-53994a69daeb',
            ],
            [
                'email' => 'admin-dudes@gaisano-cordova.com',
                'name' => 'Dudes Administrator',
                'password' => self::STAFF_PASSWORD,
                'role' => 'admin',
                'status' => 'active',
                'phone' => '09171000004',
                'gender' => 'Real Men',
                'birthday' => '1990-01-15',
                'address' => 'Lapu-Lapu City, Cebu',
                'avatar' => 'photo-1507003211169-0a1dd7228f2d',
            ],
            [
                'email' => 'admin-charlie@gaisano-cordova.com',
                'name' => 'Charlie Administrator',
                'password' => self::STAFF_PASSWORD,
                'role' => 'admin',
                'status' => 'active',
                'phone' => '09171000005',
                'gender' => 'Real Men',
                'birthday' => '1992-11-03',
                'address' => 'Mandaue City, Cebu',
                'avatar' => 'photo-1539571696357-5a69c17a67c6',
            ],
            // ---- mall workers ---------------------------------------------------
            [
                'email' => 'worker@gaisano-cordova.com',
                'name' => 'Carlo Dela Cruz',
                'password' => self::STAFF_PASSWORD,
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09172000001',
                'worker_no' => '200000000001',
                'gender' => 'Real Men',
                'birthday' => '1993-02-18',
                'address' => 'Cordova, Cebu',
                'avatar' => 'photo-1573496359142-b8d87734a5a2',
            ],
            [
                'email' => 'worker-kenlie@gaisano-cordova.com',
                'name' => 'Kenlie Worker',
                'password' => self::STAFF_PASSWORD,
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09172000002',
                'worker_no' => '200000000002',
                'gender' => 'Real Men',
                'birthday' => '1994-05-09',
                'address' => 'Cordova, Cebu',
                'avatar' => 'photo-1506794778202-cad84cf45f1d',
            ],
            [
                'email' => 'worker-sherwynn@gaisano-cordova.com',
                'name' => 'Sherwynn Worker',
                'password' => self::STAFF_PASSWORD,
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09172000003',
                'worker_no' => '200000000003',
                'gender' => 'Real Men',
                'birthday' => '1995-09-11',
                'address' => 'Lapu-Lapu City, Cebu',
                'avatar' => 'photo-1534528741775-53994a69daeb',
            ],
            [
                'email' => 'worker-dudes@gaisano-cordova.com',
                'name' => 'Dudes Worker',
                'password' => self::STAFF_PASSWORD,
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09172000004',
                'worker_no' => '200000000004',
                'gender' => 'Real Men',
                'birthday' => '1991-12-01',
                'address' => 'Mandaue City, Cebu',
                'avatar' => 'photo-1507003211169-0a1dd7228f2d',
            ],
            [
                'email' => 'worker-charlie@gaisano-cordova.com',
                'name' => 'Charlie Worker',
                'password' => self::STAFF_PASSWORD,
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09172000005',
                'worker_no' => '200000000005',
                'gender' => 'Real Men',
                'birthday' => '1990-08-24',
                'address' => 'Consolacion, Cebu',
                'avatar' => 'photo-1539571696357-5a69c17a67c6',
            ],
            // ---- active customers ----------------------------------------------
            [
                'email' => 'customer@gaisano-cordova.com',
                'name' => 'Sherwynn James Misula',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'active',
                'phone' => '09170000003',
                'customer_no' => '100000000001',
                'gender' => 'Real Men',
                'birthday' => '1995-09-11',
                'address' => 'Cordova, Cebu',
                'bad_records' => 0,
                'avatar' => 'photo-1534528741775-53994a69daeb',
            ],
            [
                'email' => 'shermaine@gaisano-cordova.com',
                'name' => 'Shermaine Misula',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'active',
                'phone' => '09170000004',
                'customer_no' => '100000000002',
                'gender' => 'Gender Neutral',
                'birthday' => '1997-01-22',
                'address' => 'Lapu-Lapu City, Cebu',
                'bad_records' => 1,
                'avatar' => 'photo-1517841905240-472988babdf9',
            ],
            [
                'email' => 'alex.smith@gaisano-cordova.com',
                'name' => 'Alex Smith',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'active',
                'phone' => '09170000009',
                'customer_no' => '100000000003',
                'gender' => 'Gender Neutral',
                'birthday' => '1992-05-14',
                'address' => 'Consolacion, Cebu',
                'bad_records' => 0,
                'avatar' => 'photo-1507003211169-0a1dd7228f2d',
            ],
            // ---- pending registrations (awaiting admin approval) ---------------
            [
                'email' => 'pending1@gaisano-cordova.com',
                'name' => 'Sherwynn James Misula',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'pending',
                'phone' => '09170000005',
                'customer_no' => null,
                'gender' => 'Real Men',
                'birthday' => '1995-09-11',
                'address' => 'Korea',
                'bad_records' => 0,
                'avatar' => 'photo-1534528741775-53994a69daeb',
            ],
            [
                'email' => 'pending2@gaisano-cordova.com',
                'name' => 'Shermaine Misula',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'pending',
                'phone' => '09170000006',
                'customer_no' => null,
                'gender' => 'Gender Neutral',
                'birthday' => '1997-01-22',
                'address' => 'Thailand',
                'bad_records' => 0,
                'avatar' => 'photo-1517841905240-472988babdf9',
            ],
            // ---- removed / banned customers ------------------------------------
            [
                'email' => 'removed.customer@gaisano-cordova.com',
                'name' => 'Removed Customer',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'removed',
                'phone' => '09170000010',
                'customer_no' => '100000000004',
                'gender' => 'Real Men',
                'birthday' => '1990-03-03',
                'address' => 'Cordova, Cebu',
                'bad_records' => 0,
                'avatar' => 'photo-1500648767791-00dcc994a43e',
            ],
            [
                'email' => 'banned.customer@gaisano-cordova.com',
                'name' => 'Banned Customer',
                'password' => 'Customer#2026Secure',
                'role' => 'customer',
                'status' => 'banned',
                'phone' => '09170000011',
                'customer_no' => '100000000005',
                'gender' => 'Female',
                'birthday' => '1994-12-09',
                'address' => 'Cordova, Cebu',
                'bad_records' => 2,
                'avatar' => 'photo-1539571696357-5a69c17a67c6',
            ],
        ];

        foreach ($accounts as $definition) {
            $this->seedAccount($definition);
        }

        $this->seedPendingIdDocuments('pending1@gaisano-cordova.com');
        $this->seedPendingIdDocuments('pending2@gaisano-cordova.com');

        $this->command?->info(sprintf(
            'UserSeeder: %d demo accounts ready (5 admins, 5 workers, 7 customers; staff password: %s).',
            count($accounts),
            self::STAFF_PASSWORD,
        ));
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function seedAccount(array $definition): User
    {
        $email = $definition['email'];
        $password = $definition['password'];
        $avatar = $definition['avatar'] ?? null;
        $status = $definition['status'];

        unset($definition['avatar'], $definition['password']);

        return User::updateOrCreate(
            ['email' => $email],
            array_merge($definition, [
                'password' => Hash::make($password),
                'email_verified_at' => $status === 'active' ? now() : null,
                'profile_photo_path' => $avatar !== null ? self::AVATAR_BASE.$avatar.'?w=500&auto=format&fit=crop&q=80' : null,
                'last_login_at' => null,
            ]),
        );
    }

    private function seedPendingIdDocuments(string $email): void
    {
        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            return;
        }

        $size = strlen((string) base64_decode(self::PLACEHOLDER_PNG_BASE64));

        $documents = [
            IdDocument::TYPE_FRONT => ['path' => 'seed/id-documents/front-placeholder.png', 'name' => 'valid-id-front.png'],
            IdDocument::TYPE_BACK => ['path' => 'seed/id-documents/back-placeholder.png', 'name' => 'valid-id-back.png'],
        ];

        foreach ($documents as $type => $document) {
            IdDocument::updateOrCreate(
                ['user_id' => $user->getKey(), 'type' => $type],
                [
                    'path' => $document['path'],
                    'original_name' => $document['name'],
                    'mime' => 'image/png',
                    'size_bytes' => $size,
                ],
            );
        }
    }

    /** Generate the small placeholder files the demo ID documents point at. */
    private function ensurePlaceholderFiles(): void
    {
        $disk = Storage::disk('private');
        $contents = base64_decode(self::PLACEHOLDER_PNG_BASE64);

        foreach (['seed/id-documents/front-placeholder.png', 'seed/id-documents/back-placeholder.png'] as $path) {
            if (! $disk->exists($path)) {
                $disk->put($path, $contents);
            }

            // In Docker the seeder may run as root (docker compose exec), which makes
            // Laravel's private-disk files 0600/0700. The web process (www-data) must be
            // able to read these demo scans, otherwise the admin ID preview 404s.
            $fullPath = $disk->path($path);
            @chmod($fullPath, 0644);
            @chmod(dirname($fullPath), 0755);
            @chmod(dirname($fullPath, 2), 0755);
        }
    }
}
