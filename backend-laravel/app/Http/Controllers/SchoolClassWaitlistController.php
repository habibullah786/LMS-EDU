<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\SchoolClassWaitlist;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolClassWaitlistController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    /**
     * Public: join the waitlist for a (typically full) class.
     */
    public function store(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'parent_name'    => ['required', 'string', 'max:255'],
            'parent_email'   => ['required', 'email', 'max:255'],
            'parent_phone'   => ['nullable', 'string', 'max:30'],
            'student_name'   => ['required', 'string', 'max:255'],
            'date_of_birth'  => ['nullable', 'date'],
        ]);

        $position = SchoolClassWaitlist::where('school_class_id', $schoolClass->id)
            ->where('status', 'waiting')
            ->count() + 1;

        $entry = SchoolClassWaitlist::create([
            'school_class_id' => $schoolClass->id,
            'parent_name'     => $data['parent_name'],
            'parent_email'    => $data['parent_email'],
            'parent_phone'    => $data['parent_phone'] ?? null,
            'student_name'    => $data['student_name'],
            'date_of_birth'   => $data['date_of_birth'] ?? null,
            'position'        => $position,
            'status'          => 'waiting',
        ]);

        $this->notifications->waitlistJoined([
            'parentName'  => $data['parent_name'],
            'parentEmail' => $data['parent_email'],
            'childName'   => $data['student_name'],
            'className'   => $schoolClass->curriculum,
            'position'    => $position,
        ]);

        return response()->json([
            'message' => 'Added to waitlist',
            'data'    => $entry,
        ], 201);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = SchoolClassWaitlist::with('schoolClass')->orderBy('position');

        if ($request->filled('school_class_id')) {
            $query->where('school_class_id', $request->school_class_id);
        }
        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    public function approve(SchoolClassWaitlist $waitlist): JsonResponse
    {
        if ($waitlist->status !== 'waiting') {
            return response()->json(['message' => 'Entry is not waiting.'], 400);
        }

        $waitlist->update(['status' => 'approved', 'approved_at' => now()]);
        $this->reorder($waitlist->school_class_id);

        $this->notifications->waitlistApproved([
            'parentName'  => $waitlist->parent_name,
            'parentEmail' => $waitlist->parent_email,
            'parentPhone' => $waitlist->parent_phone,
            'childName'   => $waitlist->student_name,
            'className'   => $waitlist->schoolClass->curriculum,
        ]);

        return response()->json(['message' => 'Approved', 'data' => $waitlist]);
    }

    public function reject(Request $request, SchoolClassWaitlist $waitlist): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $waitlist->update([
            'status'           => 'rejected',
            'rejection_reason' => $data['reason'] ?? null,
        ]);
        $this->reorder($waitlist->school_class_id);

        return response()->json(['message' => 'Rejected', 'data' => $waitlist]);
    }

    private function reorder(int $schoolClassId): void
    {
        $entries = SchoolClassWaitlist::where('school_class_id', $schoolClassId)
            ->where('status', 'waiting')
            ->orderBy('created_at')
            ->get();

        foreach ($entries as $index => $entry) {
            $entry->update(['position' => $index + 1]);
        }
    }
}
