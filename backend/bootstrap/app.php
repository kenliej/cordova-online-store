<?php

use App\Exceptions\DomainException;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Cookie-based SPA authentication (Sanctum) for the React client.
        $middleware->statefulApi();

        $middleware->alias([
            'role' => EnsureRole::class,
        ]);

        // Security headers on every response.
        $middleware->append(SecurityHeaders::class);

        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: array_map('trim', explode(',', (string) $proxies)));
        }

        if ($hosts = env('TRUSTED_HOSTS')) {
            $middleware->trustHosts(at: array_map('trim', explode(',', (string) $hosts)));
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        // Domain rule violations (stock, state machine, duplicates) are client
        // errors with a stable machine-readable code.
        $exceptions->render(function (DomainException $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            $payload = [
                'message' => $e->getMessage(),
                'code' => $e->errorCode,
            ];

            if ($e->errors !== []) {
                $payload['errors'] = $e->errors;
            }

            return response()->json($payload, $e->httpStatus);
        });

        // Do not leak model class names / lookup keys through route binding 404s.
        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json(['message' => 'Resource not found.'], 404);
        });
    })->create();
