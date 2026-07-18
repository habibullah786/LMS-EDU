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
        ]);

        $class = SchoolClass::create($data);

        return response()->json($class, 201);
    }

    public function destroy(SchoolClass $schoolClass): JsonResponse
    {
        $schoolClass->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
