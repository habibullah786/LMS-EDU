<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Lead;
use App\Models\TrialEnrollmentStudent;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OrbundEnrollmentController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parent_name'                    => 'required|string|max:255',
            'parent_email'                   => 'required|email|max:255',
            'parent_phone'                   => 'nullable|string|max:30',
            'total_amount'                   => 'nullable|numeric|min:0',
            'source'                         => 'nullable|string|max:100',
            'trial_ref_id'                   => 'nullable|string|max:100',
            'lead_id'                        => 'nullable|integer|exists:leads,id',
            'location'                       => 'nullable|string|max:100',
            'course'                         => 'nullable|string|max:100',
            'students'                       => 'nullable|array',
            'students.*.orbund_unique_id'    => 'nullable|string',
            'students.*.first_name'          => 'required_with:students|string|max:100',
            'students.*.last_name'           => 'required_with:students|string|max:100',
            'students.*.date_of_birth'       => 'nullable|date',
            'students.*.orbund_class_id'     => 'required_with:students|string|max:100',
            'students.*.class_date'          => 'nullable|date',
            'students.*.class_time'          => 'nullable|string|max:50',
            'students.*.course'              => 'nullable|string|max:100',
            'students.*.price'               => 'nullable|numeric|min:0',
        ]);

        // Find or create user in our DB
        $user = User::where('email', $data['parent_email'])->first();
        if (!$user) {
            $user = User::create([
                'name'           => $data['parent_name'],
                'email'          => $data['parent_email'],
                'password'       => Hash::make(Str::random(16)),
                'phone'          => $data['parent_phone'],
                'role'           => 'parent',
                'remember_token' => Str::random(60),
            ]);
        }

        DB::beginTransaction();
        try {
            $isFree = ($data['total_amount'] ?? 0) == 0;

            $enrollment = Enrollment::create([
                'user_id'           => $user->id,
                'parent_name'       => $data['parent_name'],
                'parent_email'      => $data['parent_email'],
                'parent_phone'      => $data['parent_phone'] ?? '',
                'total_amount'      => $data['total_amount'] ?? 0,
                'status'            => $isFree ? 'confirmed' : 'pending',
                'booking_date'      => now(),
                'registration_type' => 'individual',
                'source'            => $data['source'] ?? null,
                'trial_ref_id'      => $data['trial_ref_id'] ?? null,
                'lead_id'           => $data['lead_id'] ?? null,
            ]);

            foreach ($data['students'] ?? [] as $studentData) {
                TrialEnrollmentStudent::create([
                    'enrollment_id'    => $enrollment->id,
                    'orbund_unique_id' => $studentData['orbund_unique_id'] ?? null,
                    'first_name'       => $studentData['first_name'],
                    'last_name'        => $studentData['last_name'],
                    'date_of_birth'    => $studentData['date_of_birth'] ?? null,
                    'orbund_class_id'  => $studentData['orbund_class_id'],
                    'class_date'       => $studentData['class_date'] ?? null,
                    'class_time'       => $studentData['class_time'] ?? null,
                    'location'         => $data['location'] ?? null,
                    'course'           => $studentData['course'] ?? $data['course'] ?? null,
                    'price'            => $studentData['price'] ?? null,
                ]);
            }

            // Mark lead as enrolled if lead_id was provided
            if (!empty($data['lead_id'])) {
                Lead::where('id', $data['lead_id'])->update(['status' => 'enrolled']);
            }

            DB::commit();

            $firstStudent = $data['students'][0] ?? [];
            $notifPayload = [
                'parentName'  => $data['parent_name'],
                'parentEmail' => $data['parent_email'],
                'parentPhone' => $data['parent_phone'] ?? '',
                'childName'   => isset($firstStudent['first_name'])
                    ? $firstStudent['first_name'].' '.$firstStudent['last_name']
                    : $data['parent_name'],
                'className'   => $firstStudent['orbund_class_id'] ?? '',
                'course'      => $firstStudent['course'] ?? $data['course'] ?? '',
                'location'    => $data['location'] ?? '',
                'instructor'  => '',
                'price'       => $firstStudent['price'] ?? $data['total_amount'] ?? 0,
                'type'        => 'Trial',
            ];

            $eventData = [
                'parentName'  => $data['parent_name'],
                'parentEmail' => $data['parent_email'],
                'parentPhone' => $data['parent_phone'] ?? '',
                'location'    => $data['location'] ?? '',
                'course'      => $firstStudent['course'] ?? $data['course'] ?? '',
            ];

            $this->notifications->fireEventWorkflows('enrollment_created', $eventData);
            $this->notifications->enrollmentCreated($notifPayload);

            // For free trial, also fire confirmed notifications immediately
            if ($isFree) {
                $this->notifications->fireEventWorkflows('enrollment_confirmed', $eventData);
                $this->notifications->enrollmentConfirmed(array_merge($notifPayload, [
                    'date' => now()->toDateString(),
                    'time' => '',
                ]));
            }

            return response()->json([
                'message'       => 'Enrollment saved successfully',
                'enrollment_id' => $enrollment->id,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to save enrollment',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function confirm(int $id): JsonResponse
    {
        $enrollment = Enrollment::find($id);

        if (!$enrollment) {
            return response()->json(['message' => 'Enrollment not found'], 404);
        }

        if ($enrollment->status !== 'confirmed') {
            $enrollment->update(['status' => 'confirmed']);

            $firstStudent = TrialEnrollmentStudent::where('enrollment_id', $enrollment->id)->first();
            $childName = $firstStudent
                ? trim($firstStudent->first_name . ' ' . $firstStudent->last_name)
                : $enrollment->parent_name;
            $location  = $firstStudent?->location ?? '';

            $this->notifications->fireEventWorkflows('enrollment_confirmed', [
                'parentName'  => $enrollment->parent_name,
                'parentEmail' => $enrollment->parent_email,
                'parentPhone' => $enrollment->parent_phone,
            ]);

            $this->notifications->enrollmentConfirmed([
                'parentName'  => $enrollment->parent_name,
                'parentEmail' => $enrollment->parent_email,
                'parentPhone' => $enrollment->parent_phone,
                'childName'   => $childName,
                'className'   => $firstStudent?->orbund_class_id ?? '',
                'location'    => $location,
                'date'        => $enrollment->booking_date?->toDateString() ?? '',
                'time'        => '',
            ]);
        }

        return response()->json(['message' => 'Enrollment confirmed', 'enrollment_id' => $enrollment->id]);
    }
}
