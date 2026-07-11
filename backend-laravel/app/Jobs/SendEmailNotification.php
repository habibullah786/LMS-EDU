<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Services\SendGridService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendEmailNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly string $to,
        public readonly string $toName,
        public readonly string $subject,
        public readonly string $html,
        public readonly string $event = '',
    ) {}

    public function handle(SendGridService $sendGrid): void
    {
        $status = $sendGrid->send($this->to, $this->toName, $this->subject, $this->html);

        NotificationLog::create([
            'type'      => 'email',
            'event'     => $this->event,
            'recipient' => $this->to,
            'subject'   => $this->subject,
            'status'    => $status,
        ]);
    }
}
