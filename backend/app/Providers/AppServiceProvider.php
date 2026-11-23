<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
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
        $this->configurePasswordResetUrl();
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
        // Generated absolute URLs (e.g. password-reset e-mails) must never be
        // derived from the request Host header; pin them to APP_URL.
        if ($rootUrl = config('app.url')) {
            URL::forceRootUrl($rootUrl);
        }

        if (config('app.force_https')) {
            URL::forceScheme('https');
        }
    }

    /**
     * Password-reset e-mails must link to the SPA route, not to APP_URL: in the
     * Docker stack APP_URL is nginx (which serves the SPA and never reaches the
     * Laravel web route), and in the split deployment the frontend lives on
     * another origin. Point the notification directly at APP_FRONTEND_URL.
     */
    private function configurePasswordResetUrl(): void
    {
        ResetPassword::createUrlUsing(static function (User $user, string $token): string {
            $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');

            return $frontend.'/reset-password/'.rawurlencode($token)
                .'?email='.rawurlencode((string) $user->email);
        });
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
