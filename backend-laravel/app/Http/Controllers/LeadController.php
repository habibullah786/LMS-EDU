<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'age_group' => ['nullable', 'string', 'max:100'],
            'course' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'orbund_program_id' => ['nullable', 'string', 'max:30'],
            'orbund_campus_type' => ['nullable', 'string', 'max:30'],
            'level_id' => ['nullable', 'string', 'max:30'],
            'semester_id' => ['nullable', 'string', 'max:30'],
            'source' => ['required', 'string', 'max:100'],
            'page_url' => ['nullable', 'string', 'max:255'],
            'orbund_session_id' => ['nullable', 'string', 'max:255'],
        ]);

        $existingUser = User::whereRaw('LOWER(email) = ?', [strtolower($data['email'])])->first();
        $existingLead = Lead::where('email', strtolower($data['email']))->where('source', $data['source'])->first();
        $previousUpdatedAt = $existingLead?->updated_at;
        $registrationChanged = $existingLead && $existingLead->is_registered !== (bool) $existingUser;

        $lead = Lead::updateOrCreate(
            ['email' => strtolower($data['email']), 'source' => $data['source']],
            array_merge($data, [
                'is_registered' => (bool) $existingUser,
                'registered_at' => $existingUser ? now() : null,
                'user_id' => $existingUser?->id,
            ]),
        );

        // For leads, updated_at represents registration-status changes only.
        if ($existingLead && !$registrationChanged && $previousUpdatedAt) {
            DB::table('leads')->where('id', $lead->id)->update(['updated_at' => $previousUpdatedAt]);
            $lead->refresh();
        }

        return response()->json(['message' => 'Lead captured', 'lead_id' => $lead->id, 'is_registered' => $lead->is_registered], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['user', 'reminderCalls.operator:id,name', 'reminderEmails'])->latest();
        if ($request->has('is_registered')) {
            $query->where('is_registered', $request->boolean('is_registered'));
        }
        return response()->json($query->paginate(min((int) $request->get('per_page', 100), 100)));
    }

    public function updateRegistration(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate(['is_registered' => ['required', 'boolean']]);
        $lead->update([
            'is_registered' => $data['is_registered'],
            'registered_at' => $data['is_registered'] ? ($lead->registered_at ?? now()) : null,
            'user_id' => $data['is_registered'] ? ($lead->user_id ?? \App\Models\User::whereRaw('LOWER(email) = ?', [strtolower($lead->email)])->value('id')) : null,
        ]);

        return response()->json([
            'message' => 'Lead registration status updated',
            'lead' => $lead->fresh()->load(['reminderCalls.operator:id,name', 'reminderEmails']),
        ]);
    }

    public function logCall(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'called_at' => ['required', 'date', 'before_or_equal:now'],
        ]);

        DB::transaction(function () use ($request, $lead, $data) {
            $calledAt = \Illuminate\Support\Carbon::parse($data['called_at']);
            $lead->reminderCalls()->create(['called_by' => $request->user()->id, 'called_at' => $calledAt]);
            DB::table('leads')->where('id', $lead->id)->update([
                'reminder_call_count' => $lead->reminderCalls()->count(),
                'reminder_call_time' => $calledAt,
                'scheduled_call_time' => $lead->scheduled_call_time && $calledAt->gte($lead->scheduled_call_time)
                    ? null : $lead->scheduled_call_time,
            ]);
        });
        return response()->json([
            'message' => 'Reminder call logged',
            'lead' => $lead->fresh()->load(['reminderCalls.operator:id,name', 'reminderEmails']),
        ]);
    }

    public function scheduleCall(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'scheduled_call_time' => ['nullable', 'date', 'after:now'],
        ]);
        DB::table('leads')->where('id', $lead->id)->update([
            'scheduled_call_time' => $data['scheduled_call_time'] ?? null,
        ]);
        return response()->json([
            'message' => 'Next call schedule updated',
            'lead' => $lead->fresh()->load(['reminderCalls.operator:id,name', 'reminderEmails']),
        ]);
    }
}
