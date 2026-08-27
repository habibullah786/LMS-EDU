<?php

namespace App\Http\Controllers;

use App\Jobs\SyncEnrollmentToOrbund;
use App\Models\Enrollment;
use App\Models\Lead;
use App\Models\SchoolClass;
use App\Models\TrialEnrollmentStudent;
use App\Services\LeadLifecycleService;
use App\Services\LeadProcessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadProcessController extends Controller
{
    public function __construct(private LeadProcessService $process, private LeadLifecycleService $lifecycle) {}

    public function bookTrial(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'first_name' => ['required', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date'], 'booked_by' => ['nullable', 'in:admin,parent,phone'],
        ]);
        return response()->json(['message' => 'Trial booked', 'enrollment' => $this->process->bookTrial($lead, $data, $request->user())], 201);
    }

    public function reschedule(Request $request, TrialEnrollmentStudent $trialStudent): JsonResponse
    {
        $data = $request->validate(['school_class_id' => ['required', 'integer', 'exists:school_classes,id'], 'reason' => ['required', 'string', 'max:1000']]);
        return response()->json(['message' => 'Trial rescheduled', 'trial_student' => $this->process->rescheduleTrial($trialStudent, $data, $request->user())]);
    }

    public function decision(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:yes,no,pending'],
            'reason_code' => ['nullable', 'in:price,distance,schedule,not_ready,program_fit,competitor,decision_maker,follow_up_later,other'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $this->process->recordDecision($lead, $data, $request->user());
        return response()->json(['message' => 'Enrollment decision recorded', 'lead' => $lead->fresh()->load('nurtureSteps')]);
    }

    public function enroll(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'source' => ['required', 'in:front_desk,admin_call'], 'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'amount' => ['required', 'numeric', 'min:0'], 'payment_status' => ['required', 'in:paid,pending'],
            'payment_method' => ['required_if:payment_status,paid', 'nullable', 'string', 'max:50'],
            'transaction_id' => ['nullable', 'string', 'max:255'], 'term' => ['nullable', 'string', 'max:100'],
            'waiver_signed' => ['nullable', 'boolean'],
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date'],
        ]);
        return response()->json(['message' => 'Enrollment created', 'enrollment' => $this->process->createPaidEnrollment($lead, $data, $request->user())], 201);
    }

    public function assignClass(Request $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validate(['school_class_id' => ['required', 'integer', 'exists:school_classes,id']]);
        return response()->json(['message' => 'Roster assignment updated', 'enrollment' => $this->process->assignClass($enrollment, SchoolClass::findOrFail($data['school_class_id']), $request->user())]);
    }

    public function completePayment(Request $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validate(['amount' => ['required', 'numeric', 'min:0'], 'payment_method' => ['required', 'string', 'max:50'], 'transaction_id' => ['nullable', 'string', 'max:255']]);
        return response()->json(['message' => 'Payment recorded and enrollment activated', 'enrollment' => $this->process->completeManualPayment($enrollment, $data, $request->user())]);
    }

    public function retryOrbund(Enrollment $enrollment): JsonResponse
    {
        $enrollment->update(['orbund_sync_status' => 'queued', 'orbund_sync_error' => null]);
        SyncEnrollmentToOrbund::dispatch($enrollment->id);
        return response()->json(['message' => 'Orbund sync queued']);
    }

    public function confirmOrbund(Request $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validate(['orbund_student_id' => ['required', 'string', 'max:255'], 'notes' => ['nullable', 'string', 'max:1000']]);
        $enrollment->update(['orbund_student_id' => $data['orbund_student_id'], 'orbund_sync_status' => 'synced', 'orbund_sync_at' => now(), 'orbund_sync_error' => null]);
        if ($enrollment->lead) $this->lifecycle->transition($enrollment->lead, 'confirmed_on_orbund', $request->user(), $data['notes'] ?? 'Manually confirmed in Orbund', 'orbund_sync_confirmed_manually');
        return response()->json(['message' => 'Orbund record confirmed', 'enrollment' => $enrollment->fresh()]);
    }

    public function report(): JsonResponse
    {
        $counts = Lead::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $total = Lead::count();
        $trials = Enrollment::whereNotNull('lead_id')->whereHas('trialStudents')->count();
        $attended = Lead::whereIn('status', ['attended_trial', 'decides_to_enroll', 'did_not_enroll', 'enrolled_term_1', 'confirmed_on_orbund'])->count();
        $enrolled = Lead::whereIn('status', ['enrolled_term_1', 'confirmed_on_orbund'])->count();
        return response()->json(['status_counts' => $counts, 'total_leads' => $total, 'trial_bookings' => $trials, 'attended_trials' => $attended, 'paid_enrollments' => $enrolled,
            'lead_to_trial_rate' => $total ? round($trials / $total * 100, 1) : 0, 'trial_to_enrollment_rate' => $attended ? round($enrolled / $attended * 100, 1) : 0]);
    }
}
