<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'health' => url('/api/health'),
    ]);
});

/*
| Password-reset e-mails point at a frontend URL. The SPA owns the reset form;
| this route only forwards the signed token from the e-mail to the SPA.
*/
Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $query = http_build_query(array_filter([
        'token' => $token,
        'email' => (string) $request->query('email'),
    ]));

    return redirect()->away(rtrim((string) config('app.frontend_url'), '/').'/forgot-password?'.$query);
})->name('password.reset');
