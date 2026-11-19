<?php

namespace Database\Seeders;

use App\Models\IdDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Demo accounts required by docs/BACKEND_ARCHITECTURE.md §12 / §9.
 *
 * Idempotent (updateOrCreate on the email): re-running `db:seed` keeps the same
 * demo credentials and public account numbers.
 *
 *   admin@onlinemall.test      / Admin#2026Secure      (admin, active)
 *   worker@onlinemall.test     / Worker#2026Secure     (worker, active)
 *   customer@onlinemall.test   / Customer#2026Secure   (customer, active)
 *
 * plus a second active worker, two pending customers (with private ID scans),
 * two more active customers (one bad record), a removed customer, a banned
 * customer and a removed worker.
 */
class UserSeeder extends Seeder
{
    /** 1x1 transparent PNG used as the private ID-scan placeholder. */
    private const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private const AVATAR_BASE = 'https://images.unsplash.com/';

    public function run(): void
    {
        $this->ensurePlaceholderFiles();

        $accounts = [
            // ---- administrators -------------------------------------------------
            [
                'email' => 'admin@onlinemall.test',
                'name' => 'Mall Administrator',
                'password' => 'Admin#2026Secure',
                'role' => 'admin',
                'status' => 'active',
                'phone' => '09170000001',
                'gender' => null,
                'birthday' => '1985-04-12',
                'address' => 'Online Mall Cordova, Cordova, Cebu',
                'avatar' => 'photo-1500648767791-00dcc994a43e',
            ],
            // ---- mall workers ---------------------------------------------------
            [
                'email' => 'worker@onlinemall.test',
                'name' => 'Carlo Dela Cruz',
                'password' => 'Worker#2026Secure',
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09170000002',
                'worker_no' => '200000000001',
                'gender' => 'Real Men',
                'birthday' => '1993-02-18',
                'address' => 'Cordova, Cebu',
                'avatar' => 'photo-1573496359142-b8d87734a5a2',
            ],
            [
                'email' => 'worker2@onlinemall.test',
                'name' => 'Mariel Santos',
                'password' => 'Worker#2026Secure',
                'role' => 'worker',
                'status' => 'active',
                'phone' => '09170000007',
                'worker_no' => '200000000002',
                'gender' => 'Female',
                'birthday' => '1996-07-30',
                'address' => 'Lapu-Lapu City, Cebu',
                'avatar' => 'photo-1580489944761-15a19d654956',
            ],
            [
                'email' => 'removed.worker@onlinemall.test',
                'name' => 'Dario Mercado',
                'password' => 'Worker#2026Secure',
                'role' => 'worker',
                'status' => 'removed',
                'phone' => '09170000008',
                'worker_no' => '200000000003',
                'gender' => 'Real Men',
                'birthday' => '1990-11-05',
                'address' => 'Mandaue City, Cebu',
                'avatar' => 'photo-1507003211169-0a1dd7228f2d',
            ],
            // ---- active customers ----------------------------------------------
            [
                'email' => 'customer@onlinemall.test',
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
                'email' => 'shermaine@onlinemall.test',
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
                'email' => 'alex.smith@onlinemall.test',
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
                'email' => 'pending1@onlinemall.test',
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
                'email' => 'pending2@onlinemall.test',
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
                'email' => 'removed.customer@onlinemall.test',
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
                'email' => 'banned.customer@onlinemall.test',
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

        $this->seedPendingIdDocuments('pending1@onlinemall.test');
        $this->seedPendingIdDocuments('pending2@onlinemall.test');

        $this->command?->info(sprintf(
            'UserSeeder: %d demo accounts ready (admin/worker/customer + pending/removed/banned).',
            count($accounts),
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
        }
    }
}
