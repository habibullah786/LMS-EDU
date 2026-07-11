<?php

namespace App\Http\Controllers;

use App\Models\Waitlist;
use App\Models\Enrollment;
use App\Models\Student;
use App\Http\Requests\WaitlistApprovalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaitlistController extends Controller
{
    /**
     * Get waitlist for a class
     */
    public function getWaitlist($classId): JsonResponse
    {
        $waitlist = Waitlist::where('class_id', $classId)
            ->where('status', '!=', 'rejected')
            ->with('student', 'user')
            ->orderBy('position', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $waitlist,
        ]);
    }

    /**
     * Get user's waitlist entries
     */
    public function getUserWaitlist($userId = null): JsonResponse
    {
        if (!$userId) {
            $userId = auth()->id();
        }

        $waitlist = Waitlist::where('user_id', $userId)
            ->where('status', 'waiting')
            ->with('class.course', 'student')
            ->orderBy('position', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $waitlist,
        ]);
    }

    /**
     * Approve a waitlist entry (admin only)
     */
    public function approveWaitlistEntry($waitlistId, WaitlistApprovalRequest $request): JsonResponse
    {
        $waitlist = Waitlist::findOrFail($waitlistId);

        if ($request->action === 'approve') {
            // Check if class still has capacity
            $class = $waitlist->class;
            if (!$class->hasAvailableSeats()) {
                return response()->json([
                    'success' => false,
                    'message' => 'The class no longer has available seats.',
                ], 400);
            }

            // Approve and create enrollment
            $waitlist->approve();
            $waitlist->update(['status' => 'enrolled']);

            // Create enrollment
            $course = $class->course;
            $enrollment = Enrollment::create([
                'user_id' => $waitlist->user_id,
                'parent_name' => $waitlist->user->name,
                'parent_email' => $waitlist->user->email,
                'parent_phone' => $waitlist->user->phone,
                'total_amount' => $course->price,
                'status' => $course->price == 0 ? 'active' : 'pending_payment',
                'registration_type' => 'waitlist_approved',
                'is_paid' => $course->price == 0,
                'booking_date' => now(),
            ]);

            $enrollment->students()->create([
                'student_id' => $waitlist->student_id,
                'class_id' => $class->id,
                'course_id' => $course->id,
                'location' => $class->location,
                'course' => $course->name,
                'price' => $course->price,
            ]);

            // Decrement available seats
            $class->decrementSeats();

            return response()->json([
                'success' => true,
                'message' => 'Waitlist entry approved and student enrolled.',
                'data' => [
                    'waitlist_id' => $waitlist->id,
                    'enrollment_id' => $enrollment->id,
                ],
            ]);
        } elseif ($request->action === 'reject') {
            $waitlist->reject($request->reason ?? null);

            return response()->json([
                'success' => true,
                'message' => 'Waitlist entry rejected.',
                'data' => [
                    'waitlist_id' => $waitlist->id,
                ],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid action.',
        ], 400);
    }

    /**
     * Remove a student from waitlist
     */
    public function removeFromWaitlist($waitlistId): JsonResponse
    {
        $waitlist = Waitlist::findOrFail($waitlistId);

        // Check authorization
        if (auth()->id() !== $waitlist->user_id && !auth()->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $waitlist->update(['status' => 'rejected', 'rejection_reason' => 'User cancelled']);

        // Reorder remaining waitlist positions
        $this->reorderWaitlist($waitlist->class_id);

        return response()->json([
            'success' => true,
            'message' => 'Removed from waitlist.',
        ]);
    }

    /**
     * Get waitlist statistics for admin
     */
    public function getWaitlistStats(): JsonResponse
    {
        $stats = [
            'total_waiting' => Waitlist::where('status', 'waiting')->count(),
            'total_approved' => Waitlist::where('status', 'approved')->count(),
            'total_enrolled_from_waitlist' => Waitlist::where('status', 'enrolled')->count(),
            'total_rejected' => Waitlist::where('status', 'rejected')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Reorder waitlist positions after an entry is removed
     */
    private function reorderWaitlist($classId): void
    {
        $waitlistEntries = Waitlist::where('class_id', $classId)
            ->where('status', 'waiting')
            ->orderBy('created_at', 'asc')
            ->get();

        foreach ($waitlistEntries as $index => $entry) {
            $entry->update(['position' => $index + 1]);
        }
    }
}
