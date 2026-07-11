<?php

namespace App\Http\Controllers;

use App\Models\CustomWorkflow;
use App\Models\Enrollment;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomWorkflowController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(CustomWorkflow::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'description'        => ['nullable', 'string', 'max:500'],
            'trigger_type'       => ['required', 'in:manual,event'],
            'event_key'          => ['nullable', 'string', 'max:80'],
            'condition_location' => ['nullable', 'string', 'max:100'],
            'condition_course'   => ['nullable', 'string', 'max:100'],
            'scheduled_at'       => ['nullable', 'date', 'after:now'],
            'email_enabled'      => ['boolean'],
            'email_recipient'    => ['in:parent,admin,both'],
            'email_subject'      => ['nullable', 'string', 'max:255'],
            'email_body'         => ['nullable', 'string'],
            'sms_enabled'        => ['boolean'],
            'sms_recipient'      => ['in:parent,admin'],
            'sms_body'           => ['nullable', 'string', 'max:160'],
            'active'             => ['boolean'],
        ]);

        $workflow = CustomWorkflow::create($data);

        return response()->json($workflow, 201);
    }

    public function update(Request $request, CustomWorkflow $workflow): JsonResponse
    {
        $data = $request->validate([
            'active'       => ['sometimes', 'boolean'],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
        ]);

        // Clearing scheduled_at also clears sent marker so it can be rescheduled
        if (array_key_exists('scheduled_at', $data) && !$data['scheduled_at']) {
            $data['scheduled_sent_at'] = null;
        }

        $workflow->update($data);

        return response()->json($workflow);
    }

    public function destroy(CustomWorkflow $workflow): JsonResponse
    {
        $workflow->delete();
        return response()->json(['message' => 'Workflow deleted']);
    }

    /**
     * Manually fire a custom workflow — sends to all confirmed enrollment parents.
     */
    public function fire(CustomWorkflow $workflow, NotificationService $notifications): JsonResponse
    {
        if (!$workflow->active) {
            return response()->json(['message' => 'Workflow is disabled'], 422);
        }

        // If this is a scheduled workflow already sent, reset so it can fire again manually
        if ($workflow->scheduled_sent_at) {
            $workflow->update(['scheduled_sent_at' => null]);
        }

        $query = Enrollment::where('status', 'confirmed');

        // Apply location condition
        if ($workflow->condition_location) {
            $query->whereHas('trialStudents', fn($q) =>
                $q->where('location', $workflow->condition_location)
            );
        }

        // Apply course condition
        if ($workflow->condition_course) {
            $query->whereHas('trialStudents', fn($q) =>
                $q->where('course', $workflow->condition_course)
            );
        }

        $enrollments = $query->select('parent_name', 'parent_email', 'parent_phone')
            ->distinct()
            ->get();

        if ($enrollments->isEmpty()) {
            $filter = collect([
                $workflow->condition_location,
                $workflow->condition_course,
            ])->filter()->join(', ');

            return response()->json([
                'message' => 'No confirmed enrollments match' . ($filter ? " ({$filter})" : ''),
                'sent' => 0,
            ]);
        }

        $count = 0;
        foreach ($enrollments as $enrollment) {
            $notifications->fireCustomWorkflow($workflow, [
                'parentName'  => $enrollment->parent_name,
                'parentEmail' => $enrollment->parent_email,
                'parentPhone' => $enrollment->parent_phone,
            ]);
            $count++;
        }

        return response()->json(['message' => "Workflow fired to {$count} parent(s)", 'sent' => $count]);
    }
}
