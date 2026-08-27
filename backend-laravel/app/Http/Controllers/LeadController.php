<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\User;
use App\Services\LeadLifecycleService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    public function __construct(
        private NotificationService $notifications,
        private LeadLifecycleService $lifecycle,
    ) {}

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
            'postal_code' => ['nullable', 'string', 'max:20'],
            'preferred_call_at' => ['nullable', 'date'],
            'children_count' => ['nullable', 'integer', 'min:1', 'max:20'],
            'course_interest_count' => ['nullable', 'integer', 'min:1', 'max:20'],
            'marketing_email_consent' => ['nullable', 'boolean'],
            'marketing_sms_consent' => ['nullable', 'boolean'],
        ]);

        $data['email'] = strtolower(trim($data['email']));
        $data['phone'] = trim($data['phone']);
        $existingUser = User::whereRaw('LOWER(email) = ?', [strtolower($data['email'])])->first();
        $existingLead = Lead::where('email', $data['email'])->where('source', $data['source'])->first();
        $previousUpdatedAt = $existingLead?->updated_at;
        $registrationChanged = $existingLead && $existingLead->is_registered !== (bool) $existingUser;

        $lead = Lead::updateOrCreate(
            ['email' => strtolower($data['email']), 'source' => $data['source']],
            array_merge($data, [
                'is_registered' => (bool) $existingUser,
                'registered_at' => $existingUser ? now() : null,
                'user_id' => $existingUser?->id,
                'status' => $existingLead?->status ?? 'lead_received',
                'marketing_consent_at' => ($data['marketing_email_consent'] ?? false) || ($data['marketing_sms_consent'] ?? false)
                    ? ($existingLead?->marketing_consent_at ?? now()) : $existingLead?->marketing_consent_at,
            ]),
        );

        // For leads, updated_at represents registration-status changes only.
        if ($existingLead && !$registrationChanged && $previousUpdatedAt) {
            DB::table('leads')->where('id', $lead->id)->update(['updated_at' => $previousUpdatedAt]);
            $lead->refresh();
        }

        if (!$existingLead) {
            $this->lifecycle->record($lead, 'lead_created', null, null, null, ['source' => $lead->source]);
            $this->notifications->leadReceived(['name' => $lead->name, 'email' => $lead->email, 'course' => $lead->course]);
            $this->notifications->fireEventWorkflows('lead_received', [
                'parentName' => $lead->name, 'parentEmail' => $lead->email,
                'parentPhone' => $lead->phone, 'course' => $lead->course, 'location' => $lead->location,
            ]);
        }

        return response()->json(['message' => 'Lead captured', 'lead_id' => $lead->id, 'is_registered' => $lead->is_registered, 'status' => $lead->status], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['user', 'reminderCalls.operator:id,name', 'reminderEmails', 'activities.actor:id,name', 'duplicateOf:id,name,email', 'nurtureSteps', 'enrollments.trialStudents', 'enrollments.schoolClass'])->latest();
        if ($request->has('is_registered')) {
            $query->where('is_registered', $request->boolean('is_registered'));
        }
        if ($request->filled('status') && $request->status !== 'All') $query->where('status', $request->status);
        if ($request->boolean('follow_up_due')) $query->whereNotNull('follow_up_at')->where('follow_up_at', '<=', now());
        if ($request->filled('search')) {
            $term = '%'.strtolower(trim($request->search)).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', [$term])->orWhereRaw('LOWER(email) LIKE ?', [$term])->orWhere('phone', 'like', $term));
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
            'outcome_code' => ['nullable', 'string', 'in:no_answer,left_voicemail,trial_booked,follow_up_needed,not_interested,invalid_number,do_not_contact'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $lead, $data) {
            $calledAt = \Illuminate\Support\Carbon::parse($data['called_at']);
            $lead->reminderCalls()->create(['called_by' => $request->user()->id, 'called_at' => $calledAt, 'outcome_code' => $data['outcome_code'] ?? null, 'notes' => $data['notes'] ?? null]);
            DB::table('leads')->where('id', $lead->id)->update([
                'reminder_call_count' => $lead->reminderCalls()->count(),
                'reminder_call_time' => $calledAt,
                'scheduled_call_time' => $lead->scheduled_call_time && $calledAt->gte($lead->scheduled_call_time)
                    ? null : $lead->scheduled_call_time,
            ]);
            $this->lifecycle->record($lead, 'call', $request->user(), $data['notes'] ?? null, $data['outcome_code'] ?? null, ['called_at' => $calledAt->toIso8601String()]);
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

    public function processAction(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', 'in:add_note,mark_spam,mark_duplicate,confirm_data,set_follow_up,override_status'],
            'notes' => ['nullable', 'string', 'max:4000'],
            'reason' => ['nullable', 'string', 'max:2000'],
            'duplicate_of_lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'follow_up_at' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:'.implode(',', LeadLifecycleService::STATUSES)],
        ]);

        $actor = $request->user();
        match ($data['action']) {
            'add_note' => $this->addNote($lead, $actor, $data),
            'mark_spam' => $this->markSpam($lead, $actor, $data),
            'mark_duplicate' => $this->markDuplicate($lead, $actor, $data),
            'confirm_data' => $this->confirmData($lead, $actor, $data),
            'set_follow_up' => $this->setFollowUp($lead, $actor, $data),
            'override_status' => $this->overrideStatus($lead, $actor, $data),
        };

        return response()->json([
            'message' => 'Lead action completed',
            'lead' => $lead->fresh()->load(['reminderCalls.operator:id,name', 'reminderEmails', 'activities.actor:id,name', 'duplicateOf:id,name,email']),
        ]);
    }

    private function addNote(Lead $lead, User $actor, array $data): void
    {
        validator($data, ['notes' => ['required', 'string', 'max:4000']])->validate();
        $this->lifecycle->record($lead, 'note', $actor, $data['notes']);
    }

    private function markSpam(Lead $lead, User $actor, array $data): void
    {
        validator($data, ['reason' => ['required', 'string', 'max:2000']])->validate();
        $lead->update(['is_spam' => true, 'spam_reason' => $data['reason'], 'follow_up_at' => null, 'follow_up_required' => false]);
        $this->lifecycle->transition($lead, 'dropped_spam', $actor, $data['reason'], 'marked_spam');
    }

    private function markDuplicate(Lead $lead, User $actor, array $data): void
    {
        validator($data, ['duplicate_of_lead_id' => ['required', 'integer', 'exists:leads,id']])->validate();
        if ((int) $data['duplicate_of_lead_id'] === $lead->id) abort(422, 'A lead cannot duplicate itself.');
        $lead->update(['duplicate_of_lead_id' => $data['duplicate_of_lead_id'], 'follow_up_at' => null, 'follow_up_required' => false]);
        $this->lifecycle->transition($lead, 'duplicate', $actor, $data['reason'] ?? null, 'marked_duplicate');
    }

    private function confirmData(Lead $lead, User $actor, array $data): void
    {
        $lead->update(['data_confirmed_at' => now(), 'data_confirmed_by' => $actor->id]);
        $this->lifecycle->record($lead, 'data_confirmed', $actor, $data['notes'] ?? null);
    }

    private function setFollowUp(Lead $lead, User $actor, array $data): void
    {
        validator($data, ['follow_up_at' => ['required', 'date']])->validate();
        $lead->update(['follow_up_at' => $data['follow_up_at'], 'follow_up_required' => true]);
        $this->lifecycle->record($lead, 'follow_up_scheduled', $actor, $data['notes'] ?? null, null, ['follow_up_at' => $data['follow_up_at']]);
    }

    private function overrideStatus(Lead $lead, User $actor, array $data): void
    {
        validator($data, ['status' => ['required', 'in:'.implode(',', LeadLifecycleService::STATUSES)], 'reason' => ['required', 'string', 'max:2000']])->validate();
        $this->lifecycle->transition($lead, $data['status'], $actor, $data['reason'], 'manual_status_override');
    }
}
