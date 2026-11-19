<?php

namespace Tests\Feature\Auth;

use Illuminate\Http\UploadedFile;

/**
 * Helpers shared by the auth/accounts feature tests.
 *
 * GD is not installed in this environment, so real (tiny) image bytes are used
 * instead of UploadedFile::fake()->image().
 */
trait InteractsWithUploads
{
    /** 1x1 transparent PNG. */
    protected function tinyPngBytes(): string
    {
        return (string) base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );
    }

    protected function fakePng(string $name = 'document.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $this->tinyPngBytes());
    }

    /** Make the request look like it comes from the first-party SPA. */
    protected function stateful(): static
    {
        return $this->withHeaders([
            'Origin' => 'http://localhost',
            'Referer' => 'http://localhost/',
            'Accept' => 'application/json',
        ]);
    }
}
