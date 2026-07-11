<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LeadController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                => 'required|string|max:255',
            'email'               => 'required|email|max:255',
            'phone'               => 'required|string|max:30',
            'age_group'           => 'nullable|string|max:50',
            'orbund_program_id'   => 'nullable|string|max:20',
            'location'            => 'nullable|string|max:100',
            'orbund_campus_type'  => 'nullable|string|max:10',
            'level_id'            => 'nullable|string|max:20',
            'semester_id'         => 'nullable|string|max:20',
            'source'              => 'nullable|string|max:100',
            'page_url'            => 'nullable|string|max:100',
            'orbund_session_id'   => 'nullable|string|max:255',
        ]);

        // Upsert by email+source so duplicate form submits don't create duplicate leads
        $lead = Lead::updateOrCreate(
            ['email' => $data['email'], 'source' => $data['source'] ?? null],
            $data
        );

        $this->notifications->fireEventWorkflows('lead_received', [
            'parentName'  => $data['name'],
            'parentEmail' => $data['email'],
            'parentPhone' => $data['phone'],
        ]);

        $source = $data['source'] ?? '';
        $course = str_contains($source, 'coding') ? 'Coding' : (str_contains($source, 'robotics') ? 'Robotics' : '');

        $this->notifications->leadReceived([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'phone'     => $data['phone'],
            'age_group' => $data['age_group'] ?? '',
            'location'  => $data['location'] ?? '',
            'course'    => $course,
            'admin_email' => false, // admin notified at enrollment time when curriculum is known
        ]);

        return response()->json([
            'message' => 'Lead captured successfully',
            'lead_id' => $lead->id,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Lead::query();

        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->filled('source') && $request->source !== 'All') {
            $query->where('source', $request->source);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $leads = $query->orderBy('created_at', 'desc')
                       ->paginate($request->get('per_page', 15));

        return response()->json($leads);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json($lead->load('enrollments'));
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:new,contacted,enrolled,lost',
            'notes'  => 'nullable|string',
        ]);

        $lead->update($data);

        return response()->json([
            'message' => 'Lead updated successfully',
            'lead'    => $lead,
        ]);
    }
}
