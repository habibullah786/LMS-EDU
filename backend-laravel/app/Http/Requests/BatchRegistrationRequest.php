<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BatchRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'group_name' => ['required', 'string', 'max:255'],
            'parent_email' => ['required', 'email'],
            'parent_name' => ['required', 'string', 'max:255'],
            'parent_phone' => ['nullable', 'string', 'max:20'],
            'students' => ['required', 'array', 'min:1'],
            'students.*.name' => ['required', 'string', 'max:255'],
            'students.*.date_of_birth' => ['required', 'date'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'students.required' => 'At least one student is required for batch registration.',
            'students.min' => 'At least one student is required for batch registration.',
        ];
    }
}
