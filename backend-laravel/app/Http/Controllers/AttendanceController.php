<?php

namespace App\Http\Controllers;

use App\Models\TrialEnrollmentStudent;
use App\Services\NotificationService;
use App\Models\Lead;
use App\Services\LeadLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(private NotificationService $notifications, private LeadLifecycleService $leadLifecycle) {}

    /**
     * GET /api/admin/attendance?date=2026-07-05&curriculum=Robotics+Trial+Class+...
     */
    public function index(Request $request): JsonResponse
    {
        $date       = $request->get('date');
        $curriculum = $request->get('curriculum');

        $query = TrialEnrollmentStudent::with('enrollment');

        if ($date) {
            // Match class_date if set, otherwise fall back to enrollment creation date
            $query->where(function ($q) use ($date) {
                $q->whereDate('class_date', $date)
                  ->orWhere(function ($q2) use ($date) {
                      $q2->where(function ($q3) {
                          $q3->whereNull('class_date')->orWhere('class_date', '');
                      })->whereDate('created_at', $date);
                  });
            });
        }
        if ($curriculum) {
            $query->where('orbund_class_id', $curriculum);
        }

        $students = $query->orderBy('class_date')->orderBy('class_time')->get();

        return response()->json($students->map(fn ($s) => [
            'id'           => $s->id,
            'first_name'   => $s->first_name,
            'last_name'    => $s->last_name,
            'course'       => $s->course,
            'location'     => $s->location,
            'curriculum'   => $s->orbund_class_id,
            'class_date'   => $s->class_date?->toDateString() ?: $s->created_at?->toDateString(),
            'class_time'   => $s->class_time,
            'attended'     => $s->attended,
            'enrollment_id'=> $s->enrollment_id,
            'parent_name'  => $s->enrollment?->parent_name,
            'parent_email' => $s->enrollment?->parent_email,
            'parent_phone' => $s->enrollment?->parent_phone,
        ]));
    }

    /**
     * GET /api/admin/attendance/curricula?date=2026-07-03
     * Returns distinct curriculum names for a given date (or all if no date given).
     */
    public function curricula(Request $request): JsonResponse
    {
        $date  = $request->get('date');

        $query = TrialEnrollmentStudent::select('orbund_class_id')
            ->whereNotNull('orbund_class_id')
            ->where('orbund_class_id', '!=', '');

        if ($date) {
            $query->where(function ($q) use ($date) {
                $q->whereDate('class_date', $date)
                  ->orWhere(function ($q2) use ($date) {
                      $q2->where(function ($q3) {
                          $q3->whereNull('class_date')->orWhere('class_date', '');
                      })->whereDate('created_at', $date);
                  });
            });
        }

        $list = $query->distinct()->orderBy('orbund_class_id')->pluck('orbund_class_id');

        return response()->json($list);
    }

    /**
     * PATCH /api/admin/attendance/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $data    = $request->validate([
            'attended' => ['nullable', 'boolean'],
            'missed_reason_code' => ['nullable', 'in:forgot,schedule_conflict,illness,transportation,no_longer_interested,unable_to_contact,other'],
            'missed_reason_notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $student = TrialEnrollmentStudent::with('enrollment')->findOrFail($id);
        $attendanceChanged = $student->attended !== $data['attended'];
        $student->update([
            'attended' => $data['attended'], 'attendance_marked_at' => $data['attended'] === null ? null : now(),
            'attendance_marked_by' => $data['attended'] === null ? null : $request->user()->id,
            'missed_reason_code' => $data['attended'] === false ? ($data['missed_reason_code'] ?? null) : null,
            'missed_reason_notes' => $data['attended'] === false ? ($data['missed_reason_notes'] ?? null) : null,
        ]);
        if ($attendanceChanged && $data['attended'] !== null && $student->enrollment?->lead_id && ($lead = Lead::find($student->enrollment->lead_id))) {
            $this->leadLifecycle->transition(
                $lead,
                $data['attended'] ? 'attended_trial' : 'missed_trial',
                $request->user(),
                'Trial attendance recorded',
                'trial_attendance_marked',
            );
            $payload = [
                'parentName' => $student->enrollment->parent_name, 'parentEmail' => $student->enrollment->parent_email,
                'parentPhone' => $student->enrollment->parent_phone,
                'childName' => trim($student->first_name.' '.$student->last_name), 'course' => $student->course,
                'location' => $student->location, 'classDate' => $student->class_date?->toDateString() ?? '',
            ];
            $data['attended'] ? $this->notifications->trialThankYou($payload) : $this->notifications->trialNoShow($payload + [
                'emailSubject' => 'We missed you at Exceed Robotics',
                'emailBody' => "We missed you at the trial class. <a href='".config('services.frontend_url')."/trial'>Choose another trial time</a>.",
                'sendSms' => true, 'smsBody' => 'We missed you at Exceed Robotics. Reschedule at exceedrobotics.com/trial',
            ]);
        }
        return response()->json(['attended' => $student->fresh()->attended]);
    }

    /**
     * POST /api/admin/attendance/email-no-shows
     */
    public function emailNoShows(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'          => ['nullable', 'date'],
            'curriculum'    => ['nullable', 'string', 'max:200'],
            'email_subject' => ['required', 'string', 'max:200'],
            'email_body'    => ['required', 'string'],
            'send_sms'      => ['nullable', 'boolean'],
            'sms_body'      => ['nullable', 'string', 'max:160'],
        ]);

        $query = TrialEnrollmentStudent::with('enrollment')
            ->where('attended', false);

        if (!empty($data['date'])) {
            $date = $data['date'];
            $query->where(function ($q) use ($date) {
                $q->whereDate('class_date', $date)
                  ->orWhere(function ($q2) use ($date) {
                      $q2->where(function ($q3) {
                          $q3->whereNull('class_date')->orWhere('class_date', '');
                      })->whereDate('created_at', $date);
                  });
            });
        }
        if (!empty($data['curriculum'])) {
            $query->where('orbund_class_id', $data['curriculum']);
        }

        $students = $query->get();

        if ($students->isEmpty()) {
            return response()->json(['message' => 'No no-show students found for this filter.', 'sent' => 0]);
        }

        $sent = 0;
        foreach ($students as $student) {
            $enrollment = $student->enrollment;
            if (!$enrollment) continue;

            $this->notifications->trialNoShow([
                'parentName'   => $enrollment->parent_name  ?? 'there',
                'parentEmail'  => $enrollment->parent_email ?? '',
                'parentPhone'  => $enrollment->parent_phone ?? '',
                'childName'    => trim(($student->first_name ?? '') . ' ' . ($student->last_name ?? '')),
                'course'       => $student->course         ?? '',
                'location'     => $student->location       ?? '',
                'classDate'    => $student->class_date     ?? '',
                'emailSubject' => $data['email_subject'],
                'emailBody'    => $data['email_body'],
                'sendSms'      => !empty($data['send_sms']),
                'smsBody'      => $data['sms_body'] ?? '',
            ]);
            $sent++;
        }

        return response()->json(['message' => "Sent to {$sent} no-show students.", 'sent' => $sent]);
    }
}
