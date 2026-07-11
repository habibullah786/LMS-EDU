<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseClass;
use App\Models\Program;
use App\Models\Department;
use App\Http\Requests\CourseFilterRequest;
use Illuminate\Http\JsonResponse;

class CourseController extends Controller
{
    /**
     * List all programs
     */
    public function listPrograms(): JsonResponse
    {
        $programs = Program::with('courses')->get();

        return response()->json([
            'success' => true,
            'data' => $programs,
        ]);
    }

    /**
     * List all departments/locations
     */
    public function listDepartments(): JsonResponse
    {
        $departments = Department::all();

        return response()->json([
            'success' => true,
            'data' => $departments,
        ]);
    }

    /**
     * List courses with filters
     */
    public function listCourses(CourseFilterRequest $request): JsonResponse
    {
        $query = Course::with('program', 'department', 'classes');

        // Apply filters
        if ($request->has('program_id') && $request->program_id) {
            $query->byProgram($request->program_id);
        }

        if ($request->has('department_id') && $request->department_id) {
            $query->byDepartment($request->department_id);
        }

        if ($request->has('age_group') && $request->age_group) {
            $query->byAgeGroup($request->age_group);
        }

        if ($request->has('level') && $request->level) {
            $query->byLevel($request->level);
        }

        if ($request->has('is_trial') && $request->is_trial !== null) {
            if ($request->is_trial) {
                $query->trial();
            } else {
                $query->paid();
            }
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $courses = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $courses,
        ]);
    }

    /**
     * Get course details with available classes
     */
    public function showCourse($courseId): JsonResponse
    {
        $course = Course::with([
            'program',
            'department',
            'classes' => function ($q) {
                $q->where('status', '!=', 'cancelled')
                  ->orderBy('start_datetime', 'asc');
            }
        ])->findOrFail($courseId);

        // Map classes with availability info
        $classes = $course->classes->map(function ($class) {
            return [
                'id' => $class->id,
                'start_datetime' => $class->start_datetime,
                'end_datetime' => $class->end_datetime,
                'instructor' => $class->instructor,
                'location' => $class->location,
                'total_seats' => $class->total_seats,
                'available_seats' => $class->available_seats,
                'has_available_seats' => $class->hasAvailableSeats(),
                'status' => $class->status,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'course' => $course,
                'classes' => $classes,
            ],
        ]);
    }

    /**
     * Get available classes for a course
     */
    public function getAvailableClasses($courseId): JsonResponse
    {
        $course = Course::findOrFail($courseId);

        $classes = CourseClass::where('course_id', $courseId)
            ->where('status', '!=', 'cancelled')
            ->where('available_seats', '>', 0)
            ->orderBy('start_datetime', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $classes->map(function ($class) {
                return [
                    'id' => $class->id,
                    'start_datetime' => $class->start_datetime,
                    'end_datetime' => $class->end_datetime,
                    'instructor' => $class->instructor,
                    'location' => $class->location,
                    'available_seats' => $class->available_seats,
                    'total_seats' => $class->total_seats,
                ];
            }),
        ]);
    }

    /**
     * Get courses by location (department)
     */
    public function getCoursesByLocation($location): JsonResponse
    {
        $department = Department::where('location', $location)->firstOrFail();

        $courses = Course::where('department_id', $department->id)
            ->with('program')
            ->get();

        return response()->json([
            'success' => true,
            'location' => $location,
            'department' => $department,
            'data' => $courses,
        ]);
    }

    /**
     * Get courses by age group
     */
    public function getCoursesByAgeGroup($ageGroup): JsonResponse
    {
        $courses = Course::where('age_group', $ageGroup)
            ->with('program', 'department')
            ->get();

        return response()->json([
            'success' => true,
            'age_group' => $ageGroup,
            'data' => $courses,
        ]);
    }

    /**
     * Get filter options (for UI dropdowns)
     */
    public function getFilterOptions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'programs' => Program::all(),
                'departments' => Department::all(),
                'age_groups' => ['7-8', '9-11', '12+'],
                'levels' => ['beginner', 'intermediate', 'advanced'],
                'semesters' => ['APR-JUN', 'JUL-SEP', 'OCT-DEC', 'JAN-MAR'],
            ],
        ]);
    }
}
