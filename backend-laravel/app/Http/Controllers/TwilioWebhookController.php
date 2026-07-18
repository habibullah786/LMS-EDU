<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Services\TrialConfirmationService;
use App\Services\TwilioService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TwilioWebhookController extends Controller
{
    public function incoming(Request $request, TwilioService $twilio, TrialConfirmationService $confirmations): Response
    {
        abort_unless($twilio->validWebhookSignature($request), 403, 'Invalid Twilio signature.');
        $command = strtoupper(trim((string) $request->input('Body')));
        $action = in_array($command, ['CONFIRM', 'YES'], true) ? 'confirm'
            : (in_array($command, ['CANCEL', 'NO'], true) ? 'cancel' : null);
        if (!$action) return $this->twiml('Reply CONFIRM to attend or CANCEL if you cannot attend.');

        $phone = $twilio->normalizePhone((string) $request->input('From'));
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
