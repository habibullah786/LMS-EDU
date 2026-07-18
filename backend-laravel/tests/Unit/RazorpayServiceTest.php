<?php
namespace Tests\Unit;
use App\Services\RazorpayService;
use Tests\TestCase;
class RazorpayServiceTest extends TestCase
{
    public function test_checkout_signature_is_verified(): void
    {
        config(['services.razorpay.key_secret' => 'secret']);
        $signature = hash_hmac('sha256', 'order_1|pay_1', 'secret');
        $service = app(RazorpayService::class);
        $this->assertTrue($service->validCheckoutSignature('order_1', 'pay_1', $signature));
        $this->assertFalse($service->validCheckoutSignature('order_1', 'pay_2', $signature));
    }
}
