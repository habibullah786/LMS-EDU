<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function enrollments(Request $request): JsonResponse
    {
        $query = Enrollment::with(['students', 'trialStudents']);

        if ($request->has('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->has('location') && $request->location !== 'All') {
            $query->whereHas('students', function ($q) use ($request) {
                $q->where('location', $request->location);
            });
        }

        if ($request->has('course') && $request->course !== 'All') {
            $query->whereHas('students', function ($q) use ($request) {
                $q->where('course', $request->course);
            });
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('booking_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('booking_date', '<=', $request->date_to);
        }

        $sortBy = $request->get('sort_by', 'booking_date');
        $sortOrder = $request->get('sort_order', 'desc');
        $enrollments = $query->orderBy($sortBy, $sortOrder)->paginate($request->get('per_page', 15));

        return response()->json($enrollments);
    }

    public function stats(Request $request): JsonResponse
    {
        $query = Enrollment::with('students');

        if ($request->has('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        $enrollments = $query->get();

        return response()->json([
            'total_enrollments' => $enrollments->count(),
            'total_students' => $enrollments->sum(fn ($e) => $e->students->count()),
            'total_revenue' => $enrollments->sum('total_amount'),
            'unique_locations' => $enrollments->flatMap(fn ($e) => $e->students->pluck('location'))->unique()->count(),
            'unique_courses' => $enrollments->flatMap(fn ($e) => $e->students->pluck('course'))->unique()->count(),
        ]);
    }

    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'locations' => ['Delhi', 'Bengaluru', 'Kolkata'],
            'courses' => ['Coding', 'Robotics'],
            'statuses' => ['confirmed', 'pending', 'cancelled'],
            'types' => ['Trial', 'Paid'],
        ]);
    }

    public function users(): JsonResponse
    {
        return response()->json(User::select('id', 'name', 'email', 'phone', 'role', 'created_at')->get());
    }

    public function notificationLogs(Request $request): JsonResponse
    {
        $query = NotificationLog::orderBy('created_at', 'desc');

        if ($request->filled('type') && $request->type !== 'All') {
            $query->where('type', $request->type);
        }
        if ($request->filled('event') && $request->event !== 'All') {
            $query->where('event', $request->event);
        }
        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        return response()->json($query->limit(300)->get());
    }

}
