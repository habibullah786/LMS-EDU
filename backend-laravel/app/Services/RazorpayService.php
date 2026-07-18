<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class RazorpayService
{
    public function createOrder(Payment $payment): array
    {
        $key = (string) config('services.razorpay.key_id');
        $secret = (string) config('services.razorpay.key_secret');
        if ($key === '' || $secret === '') {
            throw new RuntimeException('Razorpay is not configured.');
        }

        return Http::withBasicAuth($key, $secret)
            ->timeout(15)
            ->retry(2, 250)
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => (int) round(((float) $payment->amount) * 100),
                'currency' => $payment->currency,
                'receipt' => 'payment-'.$payment->id,
                'notes' => ['payment_id' => (string) $payment->id],
            ])->throw()->json();
    }

    public function validCheckoutSignature(string $orderId, string $paymentId, string $signature): bool
    {
        $expected = hash_hmac('sha256', $orderId.'|'.$paymentId, (string) config('services.razorpay.key_secret'));
        return hash_equals($expected, $signature);
    }

    public function validWebhookSignature(string $payload, string $signature): bool
    {
        $secret = (string) config('services.razorpay.webhook_secret');
        return $secret !== '' && hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }
}
