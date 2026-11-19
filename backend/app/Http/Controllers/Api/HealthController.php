<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $dbOk = false;

        try {
            DB::select('SELECT 1');
            $dbOk = true;
        } catch (\Throwable) {
            $dbOk = false;
        }

        $status = $dbOk ? 200 : 503;

        return response()->json([
            'data' => [
                'status' => $dbOk ? 'ok' : 'degraded',
                'database' => $dbOk ? 'ok' : 'error',
                'time' => now()->toIso8601String(),
                'app' => config('app.name'),
            ],
        ], $status);
    }
}
