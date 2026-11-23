<?php

use App\Http\Controllers\Web\MediaController;
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
| Public-disk uploads. In Docker nginx serves /storage/* directly; on shared
| hosting (cPanel subdirectory install) this route keeps image URLs working.
*/
Route::get('/storage/{path}', MediaController::class)
    ->where('path', '.*')
    ->name('media.public');

/*
| Password-reset e-mails point at a frontend URL. The SPA owns the reset form;
| this route only forwards the signed token from the e-mail to the SPA.
*/
Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $query = http_build_query(array_filter([
        'email' => (string) $request->query('email'),
    ]));

    return redirect()->away(
        rtrim((string) config('app.frontend_url'), '/').'/reset-password/'.rawurlencode($token)
        .($query !== '' ? '?'.$query : '')
    );
})->name('password.reset');
