<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * End-to-end probe for the Neon services wired into the app:
 *   - Postgres (DATABASE_URL / DB_URL)
 *   - Object Storage (AWS_* + NEON_OBJECT_STORAGE_BUCKET, bucket "assets")
 *   - AI Gateway (NEON_AI_GATEWAY_BASE_URL / TOKEN)
 *   - Realtime configuration (NEON_REALTIME_URL / SECRET)
 *
 * The command exits non-zero only if Postgres or Object Storage fail; the AI
 * Gateway may legitimately return 403 until the Neon org has credits.
 */
class NeonProbeCommand extends Command
{
    protected $signature = 'neon:probe {--json : Print machine-readable JSON}';

    protected $description = 'Verify Neon Postgres, Object Storage, AI Gateway and Realtime wiring';

    public function handle(): int
    {
        $results = [];
        $criticalOk = true;

        // --- Postgres -----------------------------------------------------
        try {
            DB::select('select 1');
            $results['postgres'] = [
                'ok' => true,
                'driver' => DB::connection()->getDriverName(),
                'database' => DB::connection()->getDatabaseName(),
                'tables' => DB::selectOne(
                    "select count(*) as count from information_schema.tables where table_schema = 'public'"
                )->count ?? null,
            ];
        } catch (Throwable $e) {
            $criticalOk = false;
            $results['postgres'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // --- Object Storage ----------------------------------------------
        $key = 'probes/'.Str::uuid().'.txt';
        try {
            $disk = Storage::disk('neon');
            $disk->put($key, 'neon-object-storage-probe');
            $exists = $disk->exists($key);
            $roundTrip = $disk->get($key) === 'neon-object-storage-probe';
            $disk->delete($key);

            $results['object_storage'] = [
                'ok' => $exists && $roundTrip,
                'bucket' => (string) config('neon.object_storage.bucket'),
                'endpoint_configured' => (bool) env('AWS_ENDPOINT_URL_S3'),
                'region' => env('AWS_REGION'),
                'round_trip' => $roundTrip,
            ];
            if (! $results['object_storage']['ok']) {
                $criticalOk = false;
            }
        } catch (Throwable $e) {
            $criticalOk = false;
            $results['object_storage'] = [
                'ok' => false,
                'bucket' => (string) config('neon.object_storage.bucket'),
                'error' => $e->getMessage(),
            ];
        }

        // --- AI Gateway ---------------------------------------------------
        $baseUrl = rtrim((string) config('neon.ai_gateway.base_url'), '/');
        $token = (string) config('neon.ai_gateway.token');

        if ($baseUrl === '' || $token === '') {
            $results['ai_gateway'] = ['ok' => false, 'configured' => false];
        } else {
            try {
                $response = Http::withToken($token)
                    ->timeout((int) config('neon.ai_gateway.timeout', 20))
                    ->acceptJson()
                    ->get($baseUrl.'/v1/models');

                $body = $response->json();
                $models = is_array($body['data'] ?? null) ? $body['data'] : [];
                $enabled = count(array_filter($models, static fn ($model) => ($model['enabled'] ?? false) === true));

                $results['ai_gateway'] = [
                    'ok' => $response->successful(),
                    'status' => $response->status(),
                    'models' => count($models),
                    'enabled_models' => $enabled,
                    'note' => $enabled === 0
                        ? 'No enabled models: add AI Gateway credits in the Neon billing page.'
                        : null,
                    'body' => $response->successful() ? null : mb_substr($response->body(), 0, 500),
                ];
            } catch (Throwable $e) {
                $results['ai_gateway'] = ['ok' => false, 'error' => $e->getMessage()];
            }
        }

        // --- Realtime -----------------------------------------------------
        $realtimeUrl = (string) config('neon.realtime.url');
        $realtimeSecret = (string) config('neon.realtime.secret');
        $results['realtime'] = [
            'ok' => $realtimeUrl !== '' && $realtimeSecret !== '',
            'url_configured' => $realtimeUrl !== '',
            'secret_configured' => $realtimeSecret !== '',
            'note' => 'Realtime URL/secret are configured for the SPA/server; this app currently uses polling.',
        ];

        $allOk = $criticalOk && ($results['realtime']['ok'] ?? false);

        if ($this->option('json')) {
            $this->line((string) json_encode(['ok' => $allOk, 'services' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $this->newLine();
            foreach ($results as $service => $result) {
                $status = ($result['ok'] ?? false) ? '<fg=green>OK</>' : '<fg=yellow>CHECK</>';
                $details = collect($result)->except(['ok', 'body', 'note'])->map(
                    static fn ($value, $key) => $key.'='.(is_bool($value) ? ($value ? 'true' : 'false') : (string) $value)
                )->implode(' ');
                $this->line(sprintf('  %-16s %s  %s', $service, $status, $details));
                if (! empty($result['note'])) {
                    $this->line('                   '.$result['note']);
                }
                if (! empty($result['error'])) {
                    $this->line('                   <fg=red>'.mb_substr((string) $result['error'], 0, 300).'</>');
                }
            }
            $this->newLine();
        }

        return $allOk ? self::SUCCESS : self::FAILURE;
    }
}
