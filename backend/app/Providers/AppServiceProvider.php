<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configurePasswords();
        $this->configureRateLimiting();
        $this->configureUrls();
        $this->configureModelStrictness();
    }

    /**
     * Strong, offline-verifiable password policy (no HIBP network dependency).
     */
    private function configurePasswords(): void
    {
        Password::defaults(function () {
            $rule = Password::min(12)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();

            return $rule;
        });
    }

    private function configureRateLimiting(): void
    {
        // Generic API ceiling: per authenticated user, else per IP.
        RateLimiter::for('api', function (Request $request) {
            $key = $request->user()?->getAuthIdentifier();

            return Limit::perMinute(120)->by($key !== null ? 'user:'.$key : 'ip:'.$request->ip());
        });

        // Brute-force protection: keyed by submitted identifier AND IP.
        RateLimiter::for('login', function (Request $request) {
            $identifier = strtolower((string) $request->input('login', ''));

            return Limit::perMinute(5)->by('login:'.$identifier.'|'.$request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perHour(10)->by('register:'.$request->ip());
        });

        RateLimiter::for('forgot-password', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));

            return Limit::perMinute(5)->by('forgot:'.$email.'|'.$request->ip());
        });

        RateLimiter::for('contact', function (Request $request) {
            return Limit::perHour(3)->by('contact:'.$request->ip());
        });

        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(30)->by('checkout:'.($request->user()?->getAuthIdentifier() ?? $request->ip()));
        });
    }

    private function configureUrls(): void
    {
        if (config('app.force_https')) {
            URL::forceScheme('https');
        }
    }

    private function configureModelStrictness(): void
    {
        // Catch N+1 queries and silently discarded attributes during local dev;
        // keep production/tests permissive for performance and fixtures.
        if ($this->app->isLocal()) {
            Model::preventLazyLoading();
        }
    }
}
