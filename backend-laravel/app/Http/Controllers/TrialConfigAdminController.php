<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\TrialAgeGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrialConfigAdminController extends Controller
{
    // ── Locations (departments with orbund_campus_type) ───────────────────────

    public function locationsIndex(): JsonResponse
    {
        $locations = Department::select('id', 'name', 'orbund_campus_type')
            ->whereNotNull('orbund_campus_type')
            ->orderBy('name')
            ->get();

        return response()->json($locations);
    }

    public function locationsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'orbund_campus_type' => ['required', 'string', 'max:50'],
        ]);

        $dept = Department::create([
            'name'               => $data['name'],
            'orbund_campus_type' => $data['orbund_campus_type'],
        ]);

        return response()->json($dept->only('id', 'name', 'orbund_campus_type'), 201);
    }

    public function locationsDestroy(Department $department): JsonResponse
    {
        $department->update(['orbund_campus_type' => null]);

        return response()->json(['message' => 'Removed']);
    }

    // ── Age Groups ────────────────────────────────────────────────────────────

    public function ageGroupsIndex(): JsonResponse
    {
        return response()->json(TrialAgeGroup::orderBy('sort_order')->get());
    }

    public function ageGroupsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'course'            => ['required', 'in:Robotics,Coding'],
            'orbund_program_id' => ['required', 'string', 'max:50'],
            'orbund_level_id'   => ['required', 'string', 'max:50'],
        ]);

        $maxOrder = TrialAgeGroup::max('sort_order') ?? 0;
        $group = TrialAgeGroup::create([
            'name'              => $data['name'],
            'course'            => $data['course'],
            'orbund_program_id' => $data['orbund_program_id'],
            'orbund_level_id'   => $data['orbund_level_id'],
            'sort_order'        => $maxOrder + 1,
        ]);

        return response()->json($group, 201);
    }

    public function ageGroupsDestroy(TrialAgeGroup $trialAgeGroup): JsonResponse
    {
        $trialAgeGroup->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
