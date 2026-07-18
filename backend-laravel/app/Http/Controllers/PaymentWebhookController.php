<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\PaymentLifecycleService;
use App\Services\RazorpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private RazorpayService $razorpay,
        private PaymentLifecycleService $payments,
    ) {}

    public function razorpay(Request $request): JsonResponse
    {
        $signature = (string) $request->header('X-Razorpay-Signature');
        if (!$this->razorpay->validWebhookSignature($request->getContent(), $signature)) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->json()->all();
        $event = $payload['event'] ?? '';
        $entity = $payload['payload']['payment']['entity'] ?? [];
        $payment = Payment::where('gateway_order_id', $entity['order_id'] ?? null)->first();
        if (!$payment) return response()->json(['received' => true]);

        if ($event === 'payment.captured') {
            $this->payments->complete($payment, (string) $entity['id'], $entity);
        } elseif ($event === 'payment.failed') {
            $this->payments->failAndRelease($payment, 'Gateway reported payment failure');
        }

        return response()->json(['received' => true]);
    }
}
