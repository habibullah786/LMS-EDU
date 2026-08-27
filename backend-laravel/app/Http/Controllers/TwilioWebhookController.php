<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Lead;
use App\Models\LeadMessage;
use App\Services\LeadLifecycleService;
use App\Services\TrialConfirmationService;
use App\Services\TwilioService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TwilioWebhookController extends Controller
{
    public function incoming(Request $request, TwilioService $twilio, TrialConfirmationService $confirmations, LeadLifecycleService $lifecycle): Response
    {
        abort_unless($twilio->validWebhookSignature($request), 403, 'Invalid Twilio signature.');
        $command = strtoupper(trim((string) $request->input('Body')));
        $phone = $twilio->normalizePhone((string) $request->input('From'));
        $lead = Lead::latest()->get()->first(fn (Lead $item) => $twilio->normalizePhone($item->phone) === $phone);
        $messageSid = $request->input('MessageSid') ?: 'inbound-'.hash('sha256', $request->input('From').'|'.$request->input('Body').'|'.now()->format('Y-m-d-H-i'));
        LeadMessage::firstOrCreate(['provider_message_id' => $messageSid], [
            'lead_id' => $lead?->id, 'direction' => 'inbound', 'channel' => 'sms',
            'from_address' => $request->input('From'), 'to_address' => $request->input('To'),
            'body' => (string) $request->input('Body'), 'received_at' => now(),
        ]);
        if ($lead) {
            $lifecycle->record($lead, 'inbound_sms', null, (string) $request->input('Body'), null, ['message_sid' => $messageSid]);
            if (in_array($command, ['STOP', 'UNSUBSCRIBE'], true)) {
                $lead->update(['marketing_email_consent' => false, 'marketing_sms_consent' => false]);
                $lead->nurtureSteps()->where('status', 'scheduled')->update(['status' => 'cancelled']);
                return $this->twiml('You have been unsubscribed from Exceed Robotics marketing messages.');
            }
        }
        $action = in_array($command, ['CONFIRM', 'YES'], true) ? 'confirm'
            : (in_array($command, ['CANCEL', 'NO'], true) ? 'cancel' : null);
        if (!$action) {
            if ($lead) $lead->update(['follow_up_required' => true, 'follow_up_at' => now()]);
            return $this->twiml('Thanks. Our team will review your message and follow up.');
        }

        $enrollment = Enrollment::with('trialStudents')
            ->where('status', 'pending')->whereNotNull('confirmation_request_sent_at')
            ->where('confirmation_token_expires_at', '>', now())->latest('confirmation_request_sent_at')->get()
            ->first(fn (Enrollment $item) => $twilio->normalizePhone($item->parent_phone) === $phone);

        if (!$enrollment) return $this->twiml('We could not find an active pending trial for this phone number. Please contact us.');
        $result = $confirmations->respond($enrollment, $action, 'sms_reply');
        return $this->twiml($result['status'] === 'confirmed' ? 'Your trial class is confirmed. Thank you!' : 'Your trial class has been cancelled. Contact us anytime to rebook.');
    }

    private function twiml(string $message): Response
    {
        $safe = htmlspecialchars($message, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        return response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>{$safe}</Message></Response>", 200)->header('Content-Type', 'text/xml');
    }
}
