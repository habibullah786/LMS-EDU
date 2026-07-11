<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendGridService
{
    private string $apiKey;
    private string $fromEmail;
    private string $fromName;

    public function __construct()
    {
        $this->apiKey    = config('services.sendgrid.api_key', '');
        $this->fromEmail = config('services.sendgrid.from_email', 'noreply@exceedrobotics.com');
        $this->fromName  = config('services.sendgrid.from_name', 'Exceed Robotics');
    }

    public function send(string $to, string $toName, string $subject, string $html): string
    {
        if (empty($this->apiKey) || str_starts_with($this->apiKey, 'SG.dummy')) {
            Log::info('[SendGrid] Skipped (no real key) — to: '.$to.' | subject: '.$subject);
            return 'skipped';
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->apiKey,
                'Content-Type'  => 'application/json',
            ])->post('https://api.sendgrid.com/v3/mail/send', [
                'personalizations' => [[
                    'to' => [['email' => $to, 'name' => $toName]],
                ]],
                'from'    => ['email' => $this->fromEmail, 'name' => $this->fromName],
                'subject' => $subject,
                'content' => [['type' => 'text/html', 'value' => $html]],
            ]);

            if ($response->successful()) {
                Log::info('[SendGrid] Sent — to: '.$to.' | subject: '.$subject);
                return 'sent';
            }

            Log::error('[SendGrid] Failed — status: '.$response->status().' | '.$response->body());
            return 'failed';

        } catch (\Throwable $e) {
            Log::error('[SendGrid] Exception: '.$e->getMessage());
            return 'failed';
        }
    }
}
