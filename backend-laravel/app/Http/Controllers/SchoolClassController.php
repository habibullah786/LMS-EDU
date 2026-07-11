<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolClassController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(SchoolClass::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'curriculum'      => ['required', 'string', 'max:255'],
            'locations'       => ['required', 'array', 'min:1'],
            'age_groups'      => ['required', 'array', 'min:1'],
            'course'          => ['required', 'string', 'max:100'],
            'type'            => ['required', 'in:Trial,Paid'],
            'semester'        => ['nullable', 'string'],
            'price'           => ['nullable', 'numeric', 'min:0'],
            'date'            => ['nullable', 'date'],
            'time'            => ['nullable', 'string', 'max:50'],
            'available_slots' => ['nullable', 'integer', 'min:0'],
            'instructor'      => ['required', 'string', 'max:255'],
            'max_students'    => ['nullable', 'integer', 'min:1'],
            'hide_when_full'  => ['nullable', 'boolean'],
            'department'      => ['nullable', 'string', 'max:100'],
            'modules'         => ['nullable', 'array'],
            'modules.*.title'       => ['required_with:modules', 'string', 'max:255'],
            'modules.*.description' => ['nullable', 'string'],
        ]);

        $class = SchoolClass::create($data);

        return response()->json($class, 201);
    }

    public function update(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'curriculum'      => ['sometimes', 'string', 'max:255'],
            'locations'       => ['sometimes', 'array', 'min:1'],
            'age_groups'      => ['sometimes', 'array', 'min:1'],
            'course'          => ['sometimes', 'string', 'max:100'],
            'type'            => ['sometimes', 'in:Trial,Paid'],
            'semester'        => ['nullable', 'string'],
            'price'           => ['nullable', 'numeric', 'min:0'],
            'date'            => ['nullable', 'date'],
            'time'            => ['nullable', 'string', 'max:50'],
            'available_slots' => ['nullable', 'integer', 'min:0'],
            'instructor'      => ['sometimes', 'string', 'max:255'],
            'max_students'    => ['nullable', 'integer', 'min:1'],
            'hide_when_full'  => ['nullable', 'boolean'],
            'department'      => ['nullable', 'string', 'max:100'],
            'modules'         => ['nullable', 'array'],
            'modules.*.title'       => ['required_with:modules', 'string', 'max:255'],
            'modules.*.description' => ['nullable', 'string'],
        ]);

        $schoolClass->update($data);

        return response()->json($schoolClass);
    }

    public function destroy(SchoolClass $schoolClass): JsonResponse
    {
        $schoolClass->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
