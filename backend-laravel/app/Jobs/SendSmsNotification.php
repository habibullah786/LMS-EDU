<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Services\TwilioService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendSmsNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly string $to,
        public readonly string $message,
        public readonly string $event = '',
    ) {}

    public function handle(TwilioService $twilio): void
    {
        $status = $twilio->send($this->to, $this->message);

        NotificationLog::create([
            'type'      => 'sms',
            'event'     => $this->event,
            'recipient' => $this->to,
            'subject'   => null,
            'status'    => $status,
        ]);
    }
}
