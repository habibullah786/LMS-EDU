<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\TrialEnrollmentStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CertificateController extends Controller
{
    /**
     * Public: verify a certificate by its number.
     */
    public function show(string $certificateNumber): JsonResponse
    {
        $certificate = Certificate::where('certificate_number', $certificateNumber)->first();

        if (!$certificate) {
            return response()->json(['message' => 'Certificate not found'], 404);
        }

        return response()->json($certificate);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Certificate::with('trialEnrollmentStudent')->orderBy('issued_at', 'desc');

        return response()->json($query->get());
    }

    /**
     * Issue a certificate for a completed student enrollment.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'trial_enrollment_student_id' => ['required', 'integer', 'exists:trial_enrollment_students,id'],
        ]);

        $existing = Certificate::where('trial_enrollment_student_id', $data['trial_enrollment_student_id'])->first();
        if ($existing) {
            return response()->json(['message' => 'Certificate already issued', 'data' => $existing]);
        }

        $student = TrialEnrollmentStudent::findOrFail($data['trial_enrollment_student_id']);

        $certificate = Certificate::create([
            'trial_enrollment_student_id' => $student->id,
            'certificate_number'          => 'ER-' . now()->format('Y') . '-' . strtoupper(Str::random(8)),
            'student_name'                => trim($student->first_name . ' ' . $student->last_name),
            'course'                      => $student->course,
            'location'                    => $student->location,
            'issued_at'                   => now()->toDateString(),
        ]);

        return response()->json($certificate, 201);
    }

    public function destroy(Certificate $certificate): JsonResponse
    {
        $certificate->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
