<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'parent_name' => 'required|string|max:255',
            'parent_email' => 'required|email|max:255',
            'parent_phone' => 'required|string|regex:/^[0-9\s\+\-()]+$/|max:20',
            'total_amount' => 'required|numeric|min:0|max:999999.99',
            'status' => 'required|in:confirmed,pending,cancelled',
            'booking_date' => 'required|date|date_format:Y-m-d|after_or_equal:today',
            'students' => 'required|array|min:1',
            'students.*.student_id' => 'required|integer|exists:students,id',
            'students.*.class_id' => 'required|string|max:50',
            'students.*.class_name' => 'required|string|max:255',
            'students.*.course' => 'required|in:Coding,Robotics',
            'students.*.location' => 'required|in:Delhi,Bengaluru,Kolkata',
            'students.*.instructor' => 'required|string|max:255',
            'students.*.price' => 'required|numeric|min:0|max:999999.99',
            'students.*.type' => 'required|in:Trial,Paid',
        ];
    }

    public function messages(): array
    {
        return [
            'parent_name.required' => 'Parent name is required',
            'parent_email.required' => 'Parent email is required',
            'parent_email.email' => 'Please provide a valid email address',
            'parent_phone.required' => 'Parent phone number is required',
            'parent_phone.regex' => 'Phone number format is invalid',
            'total_amount.required' => 'Total amount is required',
            'total_amount.numeric' => 'Total amount must be a number',
            'total_amount.min' => 'Total amount cannot be negative',
            'status.required' => 'Enrollment status is required',
            'status.in' => 'Invalid enrollment status. Must be confirmed, pending, or cancelled',
            'booking_date.required' => 'Booking date is required',
            'booking_date.date_format' => 'Booking date format must be YYYY-MM-DD',
            'booking_date.after_or_equal' => 'Booking date cannot be in the past',
            'students.required' => 'At least one student is required',
            'students.*.student_id.required' => 'Student ID is required',
            'students.*.student_id.exists' => 'Selected student does not exist',
            'students.*.class_id.required' => 'Class ID is required',
            'students.*.course.required' => 'Course is required',
            'students.*.course.in' => 'Invalid course. Must be Coding or Robotics',
            'students.*.location.required' => 'Location is required',
            'students.*.location.in' => 'Invalid location. Must be Delhi, Bengaluru, or Kolkata',
        ];
    }
}
