<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\PaymentLifecycleService;
use Illuminate\Console\Command;

class ExpirePaymentReservations extends Command
{
    protected $signature = 'payments:expire-reservations';
    protected $description = 'Release seats held by expired pending payments';

    public function handle(PaymentLifecycleService $lifecycle): int
    {
        Payment::where('status', 'pending')->where('expires_at', '<=', now())
            ->orderBy('id')->chunkById(100, function ($payments) use ($lifecycle) {
                foreach ($payments as $payment) {
                    $lifecycle->failAndRelease($payment, 'Payment reservation expired');
                }
            });
        return self::SUCCESS;
    }
}
