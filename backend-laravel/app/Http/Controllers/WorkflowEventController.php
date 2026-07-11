<?php

namespace App\Http\Controllers;

use App\Models\WorkflowEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowEventController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(WorkflowEvent::orderBy('sort_order')->orderBy('label')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key'         => ['required', 'string', 'max:80', 'unique:workflow_events,key', 'regex:/^[a-z0-9_]+$/'],
            'label'       => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        $event = WorkflowEvent::create($data);
        return response()->json($event, 201);
    }

    public function update(Request $request, WorkflowEvent $workflowEvent): JsonResponse
    {
        $data = $request->validate([
            'label'       => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        $workflowEvent->update($data);
        return response()->json($workflowEvent);
    }

    public function destroy(WorkflowEvent $workflowEvent): JsonResponse
    {
        $workflowEvent->delete();
        return response()->json(['message' => 'Event deleted']);
    }
}
