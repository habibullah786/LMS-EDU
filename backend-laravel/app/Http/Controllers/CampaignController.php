<?php

namespace App\Http\Controllers;

use App\Jobs\SendEmailNotification;
use App\Jobs\SendSmsNotification;
use App\Models\Campaign;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bulk SMS/email marketing campaigns sent to parents matching a location
 * and/or course filter, reusing the same SendGrid/Twilio jobs as
 * transactional notifications so everything still lands in notification_logs.
 */
class CampaignController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Campaign::orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'channel'         => ['required', 'in:email,sms,both'],
            'subject'         => ['nullable', 'string', 'max:255', 'required_if:channel,email,both'],
            'body'            => ['required', 'string'],
            'filter_location' => ['nullable', 'string', 'max:100'],
            'filter_course'   => ['nullable', 'string', 'max:100'],
        ]);

        $campaign = Campaign::create($data);

        $recipients = $this->audienceFor($data['filter_location'] ?? null, $data['filter_course'] ?? null);

        $sent = 0;
        foreach ($recipients as $r) {
            if (in_array($campaign->channel, ['email', 'both']) && $r['email']) {
                SendEmailNotification::dispatch($r['email'], $r['name'], $data['subject'], '<p>' . nl2br(e($data['body'])) . '</p>', 'campaign');
                $sent++;
            }
            if (in_array($campaign->channel, ['sms', 'both']) && $r['phone']) {
                SendSmsNotification::dispatch($r['phone'], $data['body'], 'campaign');
                $sent++;
            }
        }

        $campaign->update(['sent_count' => $sent, 'sent_at' => now()]);

        return response()->json(['message' => "Campaign sent to {$sent} recipient message(s).", 'data' => $campaign->fresh()], 201);
    }

    /**
     * @return array<int, array{name: string, email: string|null, phone: string|null}>
     */
    private function audienceFor(?string $location, ?string $course): array
    {
        $query = Enrollment::query()->distinct();

        if ($location || $course) {
            $query->whereHas('trialStudents', function ($q) use ($location, $course) {
                if ($location) $q->where('location', $location);
                if ($course)   $q->where('course', $course);
            });
        }

        return $query->get(['parent_name', 'parent_email', 'parent_phone'])
            ->unique('parent_email')
            ->map(fn ($e) => ['name' => $e->parent_name, 'email' => $e->parent_email, 'phone' => $e->parent_phone])
            ->values()
            ->all();
    }
}
