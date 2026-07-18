<?php

namespace App\Http\Controllers;

use App\Services\TrialConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrialConfirmationController extends Controller
{
    public function __construct(private TrialConfirmationService $confirmations) {}

    public function show(string $token): JsonResponse
    {
        $enrollment = $this->confirmations->findByToken($token);
        if (!$enrollment) return response()->json(['message' => 'This confirmation link is invalid.'], 404);

        $student = $enrollment->trialStudents->first();
        return response()->json([
            'status' => $enrollment->status,
            'expired' => $enrollment->confirmation_token_expires_at?->isPast() ?? true,
            'parent_name' => $enrollment->parent_name,
            'student_name' => $student ? trim($student->first_name.' '.$student->last_name) : '',
            'class_name' => $student?->orbund_class_id,
            'class_date' => $student?->class_date,
            'class_time' => $student?->class_time,
            'location' => $student?->location,
        ]);
    }

    public function update(Request $request, string $token): JsonResponse
    {
        $data = $request->validate(['action' => 'required|in:confirm,cancel', 'channel' => 'required|in:email_link,sms_link']);
        $enrollment = $this->confirmations->findByToken($token);
        if (!$enrollment) return response()->json(['message' => 'This confirmation link is invalid.'], 404);
        if ($enrollment->confirmation_token_expires_at?->isPast()) return response()->json(['message' => 'This confirmation link has expired.'], 410);
        return response()->json($this->confirmations->respond($enrollment, $data['action'], $data['channel']));
    }
}
