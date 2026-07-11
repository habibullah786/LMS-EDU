<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Public: validate a coupon code against a cart amount.
     */
    public function validateCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'   => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $coupon = Coupon::whereRaw('UPPER(code) = ?', [strtoupper($data['code'])])->first();

        if (!$coupon || !$coupon->isValidFor((float) $data['amount'])) {
            return response()->json([
                'valid'   => false,
                'message' => 'This coupon is not valid for the current order.',
            ], 200);
        }

        $discount = $coupon->discountFor((float) $data['amount']);

        return response()->json([
            'valid'    => true,
            'code'     => $coupon->code,
            'discount' => $discount,
            'total'    => round((float) $data['amount'] - $discount, 2),
        ]);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        return response()->json(Coupon::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'           => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'discount_type'  => ['required', 'in:percent,fixed'],
            'discount_value' => ['required', 'numeric', 'min:0'],
            'min_amount'     => ['nullable', 'numeric', 'min:0'],
            'max_uses'       => ['nullable', 'integer', 'min:1'],
            'expires_at'     => ['nullable', 'date'],
            'active'         => ['nullable', 'boolean'],
        ]);

        $data['code'] = strtoupper($data['code']);

        $coupon = Coupon::create($data);

        return response()->json($coupon, 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'discount_type'  => ['sometimes', 'in:percent,fixed'],
            'discount_value' => ['sometimes', 'numeric', 'min:0'],
            'min_amount'     => ['nullable', 'numeric', 'min:0'],
            'max_uses'       => ['nullable', 'integer', 'min:1'],
            'expires_at'     => ['nullable', 'date'],
            'active'         => ['nullable', 'boolean'],
        ]);

        $coupon->update($data);

        return response()->json($coupon);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
