<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Corporate portal: companies register a discount code with us; their
 * employees use the company code at registration to get the company's
 * negotiated discount automatically applied.
 */
class CompanyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Company::with('discountCoupon')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'code'               => ['required', 'string', 'max:50', 'unique:companies,code'],
            'contact_email'      => ['nullable', 'email', 'max:255'],
            'discount_coupon_id' => ['nullable', 'integer', 'exists:coupons,id'],
            'active'             => ['nullable', 'boolean'],
        ]);

        $data['code'] = strtoupper($data['code']);

        return response()->json(Company::create($data), 201);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name'               => ['sometimes', 'string', 'max:255'],
            'contact_email'      => ['nullable', 'email', 'max:255'],
            'discount_coupon_id' => ['nullable', 'integer', 'exists:coupons,id'],
            'active'             => ['nullable', 'boolean'],
        ]);

        $company->update($data);

        return response()->json($company);
    }

    public function destroy(Company $company): JsonResponse
    {
        $company->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
