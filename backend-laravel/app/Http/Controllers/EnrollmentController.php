<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Enrollment;
use App\Models\EnrollmentStudent;
use App\Models\Program;
use App\Http\Requests\StoreEnrollmentRequest;
use App\Http\Requests\UpdateEnrollmentRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EnrollmentController extends Controller
{
    /**
     * List all enrollments with filtering
     */
    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::with(['students', 'trialStudents'])
            ->where('user_id', $request->user()->id);

        // Apply filters
        if ($request->has('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->has('location') && $request->location !== 'All') {
            $query->whereHas('students', function ($q) {
                $q->where('location', request('location'));
            });
        }

        if ($request->has('course') && $request->course !== 'All') {
            $query->whereHas('students', function ($q) {
                $q->where('course', request('course'));
            });
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('booking_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('booking_date', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = in_array($request->get('sort_by'), ['booking_date', 'status', 'total_amount', 'created_at'], true)
            ? $request->get('sort_by') : 'booking_date';
        $sortOrder = $request->get('sort_order') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $enrollments = $query->paginate($perPage);

        return response()->json($enrollments);
    }

    /**
     * Get enrollment statistics
     */
    public function stats(Request $request): JsonResponse
    {
        $query = Enrollment::with('students')->where('user_id', $request->user()->id);

        // Apply status filter
        if ($request->has('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        $enrollments = $query->get();

        return response()->json([
            'total_enrollments' => $enrollments->count(),
            'total_students' => $enrollments->sum(fn($e) => $e->students->count()),
            'total_revenue' => $enrollments->sum('total_amount'),
            'unique_locations' => $enrollments->flatMap(fn($e) => $e->students->pluck('location'))->unique()->count(),
            'unique_courses' => $enrollments->flatMap(fn($e) => $e->students->pluck('course'))->unique()->count(),
        ]);
    }

    /**
     * Get available filter options
     */
    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'locations' => Department::pluck('location')->filter()->unique()->values(),
            'courses' => Program::pluck('name')->filter()->unique()->values(),
            'statuses' => ['confirmed', 'pending', 'cancelled'],
            'types' => ['Trial', 'Paid'],
        ]);
    }

    /**
     * Create a new enrollment
     */
    public function store(StoreEnrollmentRequest $request): JsonResponse
    {
        try {
            $enrollment = Enrollment::create([
                'user_id' => $request->user()->id,
                'parent_name' => $request->parent_name,
                'parent_email' => $request->parent_email,
                'parent_phone' => $request->parent_phone,
                'total_amount' => $request->total_amount,
                'status' => $request->status,
                'booking_date' => $request->booking_date,
            ]);

            // Create enrollment students
            foreach ($request->students as $studentData) {
                EnrollmentStudent::create([
                    'enrollment_id' => $enrollment->id,
                    'student_id' => $studentData['student_id'],
                    'class_id' => $studentData['class_id'],
                    'class_name' => $studentData['class_name'],
                    'course' => $studentData['course'],
                    'location' => $studentData['location'],
                    'instructor' => $studentData['instructor'],
                    'price' => $studentData['price'],
                    'type' => $studentData['type'],
                ]);
            }

            return response()->json([
                'message' => 'Enrollment created successfully',
                'enrollment' => $enrollment->load('students'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create enrollment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single enrollment
     */
    public function show(Enrollment $enrollment): JsonResponse
    {
        abort_unless($enrollment->user_id === request()->user()->id, 404);
        return response()->json($enrollment->load('students'));
    }

    /**
     * Update enrollment
     */
    public function update(UpdateEnrollmentRequest $request, Enrollment $enrollment): JsonResponse
    {
        try {
            $data = $request->validated();
            if (isset($data['status']) && $data['status'] !== $enrollment->status) {
                $data['confirmation_responded_at'] = now();
                $data['confirmation_response_channel'] = 'admin';
            }
            $enrollment->update($data);

            return response()->json([
                'message' => 'Enrollment updated successfully',
                'enrollment' => $enrollment->load('students'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update enrollment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete enrollment
     */
    public function destroy(Enrollment $enrollment): JsonResponse
    {
        try {
            $enrollment->delete();

            return response()->json([
                'message' => 'Enrollment deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete enrollment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
