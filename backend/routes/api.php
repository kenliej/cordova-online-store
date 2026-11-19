<?php

use App\Http\Controllers\Api\Admin\AccountController;
use App\Http\Controllers\Api\Admin\ContactMessageController;
use App\Http\Controllers\Api\Admin\SalesController;
use App\Http\Controllers\Api\Admin\StoreController as AdminStoreController;
use App\Http\Controllers\Api\Admin\WorkerController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordResetController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\Public\CategoryController;
use App\Http\Controllers\Api\Public\ContactController;
use App\Http\Controllers\Api\Public\HomeController;
use App\Http\Controllers\Api\Public\ProductController;
use App\Http\Controllers\Api\Public\StoreController;
use App\Http\Controllers\Api\Worker\OrderController as WorkerOrderController;
use App\Http\Controllers\Api\Worker\ProductController as WorkerProductController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
*/

Route::get('/health', HealthController::class)->name('api.health');

Route::get('/home', HomeController::class);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product:slug}', [ProductController::class, 'show']);
Route::get('/stores', [StoreController::class, 'index']);
Route::get('/stores/{store:slug}', [StoreController::class, 'show']);

Route::post('/contact', [ContactController::class, 'store'])->middleware('throttle:contact');

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/auth/register', RegisterController::class)->middleware('throttle:register');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendResetLinkEmail'])
    ->middleware('throttle:forgot-password');
Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:forgot-password');

/*
|--------------------------------------------------------------------------
| Authenticated (any role)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);
    Route::get('/profile/id-documents/{document}', [ProfileController::class, 'downloadIdDocument']);
});

/*
|--------------------------------------------------------------------------
| Customer
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'store']);
    Route::delete('/cart/items', [CartController::class, 'clear']);
    Route::patch('/cart/items/{item}', [CartController::class, 'update']);
    Route::delete('/cart/items/{item}', [CartController::class, 'destroy']);

    Route::post('/checkout', CheckoutController::class)->middleware('throttle:checkout');

    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}/cancel', [OrderController::class, 'cancel']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});

/*
|--------------------------------------------------------------------------
| Worker (mall staff)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'role:worker,admin'])->prefix('worker')->group(function () {
    Route::get('/orders', [WorkerOrderController::class, 'index']);
    Route::get('/orders/{order}', [WorkerOrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [WorkerOrderController::class, 'updateStatus']);

    Route::get('/products', [WorkerProductController::class, 'index']);
    Route::post('/products', [WorkerProductController::class, 'store']);
    Route::match(['put', 'patch'], '/products/{product}', [WorkerProductController::class, 'update']);
    Route::delete('/products/{product}', [WorkerProductController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    // Account approvals / removals
    Route::get('/accounts', [AccountController::class, 'index']);
    Route::get('/accounts/{user}/id-documents', [AccountController::class, 'idDocuments']);
    Route::post('/accounts/{user}/approve', [AccountController::class, 'approve']);
    Route::post('/accounts/{user}/reject', [AccountController::class, 'reject']);
    Route::post('/accounts/{user}/remove', [AccountController::class, 'remove']);
    Route::post('/accounts/{user}/restore', [AccountController::class, 'restore']);

    // Worker accounts
    Route::get('/workers', [WorkerController::class, 'index']);
    Route::post('/workers', [WorkerController::class, 'store']);
    Route::patch('/workers/{user}', [WorkerController::class, 'update']);
    Route::delete('/workers/{user}', [WorkerController::class, 'destroy']);

    // Stores
    Route::get('/stores', [AdminStoreController::class, 'index']);
    Route::post('/stores', [AdminStoreController::class, 'store']);
    Route::get('/stores/{store}', [AdminStoreController::class, 'show']);
    Route::match(['put', 'patch'], '/stores/{store}', [AdminStoreController::class, 'update']);
    Route::delete('/stores/{store}', [AdminStoreController::class, 'destroy']);

    // Sales reports
    Route::get('/sales/summary', [SalesController::class, 'summary']);
    Route::get('/sales', [SalesController::class, 'index']);

    // Contact messages
    Route::get('/contact-messages', [ContactMessageController::class, 'index']);
    Route::patch('/contact-messages/{message}', [ContactMessageController::class, 'update']);
});
