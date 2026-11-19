<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled work
|--------------------------------------------------------------------------
| Ready-to-claim orders that nobody picks up within the 3-day window are
| automatically moved to "Didn't Claimed", stock is returned and the customer
| receives a bad record (see App\Console\Commands\MarkOverdueOrdersUnclaimed).
*/
Schedule::command('orders:mark-unclaimed')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
