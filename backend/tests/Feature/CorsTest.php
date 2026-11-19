<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CORS behaviour for the split deployment: SPA on https://<app>.vercel.app,
 * API on https://kjugarap.top/omc-backend.
 */
class CorsTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND_ORIGIN = 'https://omc.vercel.app';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'cors.allowed_origins' => [self::FRONTEND_ORIGIN],
            'cors.allowed_origins_patterns' => [],
            'cors.supports_credentials' => false,
            'cors.max_age' => 3600,
        ]);
    }

    public function test_preflight_allows_the_configured_frontend_origin(): void
    {
        $response = $this->call('OPTIONS', '/api/auth/token', [], [], [], [
            'HTTP_ORIGIN' => self::FRONTEND_ORIGIN,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,content-type,x-requested-with',
        ]);

        $response->assertStatus(204);
        $this->assertSame(self::FRONTEND_ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
        // Preflight responses vary on the request method/headers (not Origin).
        $this->assertStringContainsString(
            'Access-Control-Request-Method',
            (string) $response->headers->get('Vary')
        );
        $this->assertNotNull($response->headers->get('Access-Control-Allow-Methods'));
        $this->assertStringContainsString(
            'authorization',
            strtolower((string) $response->headers->get('Access-Control-Allow-Headers'))
        );
    }

    public function test_simple_cross_origin_request_receives_allow_origin(): void
    {
        $response = $this->withHeader('Origin', self::FRONTEND_ORIGIN)->getJson('/api/health');

        $response->assertOk();
        $this->assertSame(self::FRONTEND_ORIGIN, $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_untrusted_origin_is_not_echoed_back(): void
    {
        // With several allowed origins the CORS service runs in dynamic mode and
        // only echoes origins that are on the allow-list.
        config(['cors.allowed_origins' => [self::FRONTEND_ORIGIN, 'https://admin.example.test']]);

        $response = $this->withHeader('Origin', 'https://evil.example')->getJson('/api/health');

        $response->assertOk();
        $this->assertNotSame('https://evil.example', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_origin_patterns_can_allow_vercel_previews(): void
    {
        // Patterns must be delimited PCRE regexes and must not contain commas.
        config([
            'cors.allowed_origins' => [],
            'cors.allowed_origins_patterns' => ['/^https:\/\/.*\.vercel\.app$/'],
        ]);

        $preview = 'https://omc-git-feature-team.vercel.app';
        $response = $this->withHeader('Origin', $preview)->getJson('/api/health');

        $response->assertOk();
        $this->assertSame($preview, $response->headers->get('Access-Control-Allow-Origin'));
    }
}
