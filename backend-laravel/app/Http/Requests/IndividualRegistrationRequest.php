<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IndividualRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone' => ['nullable', 'string', 'max:20'],
            'student_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'class_id.exists' => 'The selected class does not exist or is no longer available.',
        ];
    }
}
