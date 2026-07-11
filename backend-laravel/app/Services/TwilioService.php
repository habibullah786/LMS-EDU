<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TwilioService
{
    private string $sid;
    private string $token;
    private string $from;

    public function __construct()
    {
        $this->sid   = config('services.twilio.sid', '');
        $this->token = config('services.twilio.token', '');
        $this->from  = config('services.twilio.from', '');
    }

    public function send(string $to, string $message): string
    {
        if (empty($this->sid) || str_starts_with($this->sid, 'ACdummy')) {
            Log::info('[Twilio] Skipped (no real credentials) — to: '.$to.' | msg: '.substr($message, 0, 60));
            return 'skipped';
        }

        $e164 = $this->toE164($to);
        if (!$e164) {
            Log::warning('[Twilio] Skipped — invalid phone number: '.$to);
            return 'skipped';
        }

        try {
            $response = Http::withBasicAuth($this->sid, $this->token)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->sid}/Messages.json", [
                    'From' => $this->from,
                    'To'   => $e164,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                Log::info('[Twilio] Sent — to: '.$e164);
                return 'sent';
            }

            Log::error('[Twilio] Failed — status: '.$response->status().' | '.$response->body());
            return 'failed';

        } catch (\Throwable $e) {
            Log::error('[Twilio] Exception: '.$e->getMessage());
            return 'failed';
        }
    }

    private function toE164(string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (strlen($digits) === 10) {
            return '+91'.$digits;
        }
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            return '+'.$digits;
        }
        if (strlen($digits) >= 10 && strlen($digits) <= 15) {
            return '+'.$digits;
        }

        return null;
    }
}
