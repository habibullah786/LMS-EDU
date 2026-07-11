<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'sometimes|required|in:confirmed,pending,cancelled',
            'parent_name' => 'sometimes|required|string|max:255',
            'parent_email' => 'sometimes|required|email|max:255',
            'parent_phone' => 'sometimes|required|string|regex:/^[0-9\s\+\-()]+$/|max:20',
            'total_amount' => 'sometimes|required|numeric|min:0|max:999999.99',
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Invalid status. Must be confirmed, pending, or cancelled',
            'parent_email.email' => 'Please provide a valid email address',
            'parent_phone.regex' => 'Phone number format is invalid',
            'total_amount.numeric' => 'Total amount must be a number',
        ];
    }
}
