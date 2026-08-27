<?php

namespace App\Services;

use App\Models\Enrollment;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OrbundSyncService
{
    public function sync(Enrollment $enrollment): array
    {
        $url = config('services.orbund.sync_url');
        if (!$url) throw new RuntimeException('Orbund sync URL is not configured. Manual confirmation is required.');
        $response = Http::withToken((string) config('services.orbund.api_token'))->timeout(20)->post($url, [
            'external_enrollment_id' => $enrollment->id, 'parent' => ['name' => $enrollment->parent_name, 'email' => $enrollment->parent_email, 'phone' => $enrollment->parent_phone],
            'students' => $enrollment->students->map(fn ($student) => ['name' => $student->student?->name ?? $student->class_name, 'class_id' => $student->class_id, 'term' => $enrollment->term])->all(),
        ]);
        if (!$response->successful()) throw new RuntimeException('Orbund rejected the sync request (HTTP '.$response->status().').');
        return $response->json() ?: [];
    }
}

