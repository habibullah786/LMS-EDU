<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sync Orbund class list into local DB every 30 days.
// Server cron must run: * * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
Schedule::command('notifications:send-reminders')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('notifications:send-scheduled')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('payments:expire-reservations')->everyMinute()->withoutOverlapping();

Schedule::command('leads:send-registration-reminders')
    ->dailyAt('09:15')
    ->withoutOverlapping();

Schedule::command('leads:send-nurture')->hourly()->withoutOverlapping();


