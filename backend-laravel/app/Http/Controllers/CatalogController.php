<?php

namespace App\Http\Controllers;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    /**
     * Location -> Age Group -> Course -> Curriculum -> Classes
     */
    public function search(Request $request): JsonResponse
    {
        $query = Course::with([
            'program',
            'department',
            'curricula' => function ($q) {
                $q->with(['classes' => function ($cq) {
                    $cq->where('status', '!=', 'cancelled')
                       ->orderBy('start_datetime', 'asc');
                }]);
            },
        ]);

        if ($request->filled('location')) {
            $location = $request->location;
            $query->whereHas('department', function ($q) use ($location) {
                $q->where('location', $location);
            });
        }

        if ($request->filled('age_group')) {
            $query->byAgeGroup($request->age_group);
        }

        if ($request->filled('course_id')) {
            $query->where('id', $request->course_id);
        }

        $courses = $query->get();

        return response()->json([
            'success' => true,
            'data' => $courses,
        ]);
    }
}
