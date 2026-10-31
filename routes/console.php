<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('attendance:mark-absent')
    ->dailyAt('08:00')
    ->timezone(config('app.timezone'))
    ->withoutOverlapping();

Schedule::command('attendance:mark-absent')
    ->dailyAt('17:00')
    ->timezone(config('app.timezone'))
    ->withoutOverlapping();

Schedule::command('attendance:mark-absent')
    ->dailyAt('23:59')
    ->timezone(config('app.timezone'))
    ->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
