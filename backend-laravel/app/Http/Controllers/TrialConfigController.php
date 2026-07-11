<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\SchoolClass;
use App\Models\TrialAgeGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrialConfigController extends Controller
{
    public function config(): JsonResponse
    {
        $locations = Department::select('id', 'name', 'orbund_campus_type')
            ->whereNotNull('orbund_campus_type')
            ->orderBy('name')
            ->get();

        $ageGroups = TrialAgeGroup::select('id', 'name', 'course', 'orbund_program_id', 'orbund_level_id')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'locations'   => $locations,
            'age_groups'  => $ageGroups,
            'semester_id' => '4000979',
        ]);
    }

    public function classes(Request $request): JsonResponse
    {
        $course   = $request->query('course');
        $location = $request->query('location');
        $ageGroup = $request->query('age_group');

        $query = SchoolClass::query();
        if ($course) {
            $query->where('course', $course);
        }

        $classes = $query->get()->filter(function (SchoolClass $cls) use ($location, $ageGroup) {
            if ($location && !in_array($location, $cls->locations ?? [])) {
                return false;
            }
            if ($ageGroup && !in_array($ageGroup, $cls->age_groups ?? [])) {
                return false;
            }
            return true;
        })->values();

        return response()->json($classes);
    }
}
