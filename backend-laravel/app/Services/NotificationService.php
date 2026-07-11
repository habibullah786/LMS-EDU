<?php

namespace App\Services;

use App\Jobs\SendEmailNotification;
use App\Jobs\SendSmsNotification;
use App\Models\CustomWorkflow;

class NotificationService
{
    private string $adminEmail;

    public function __construct()
    {
        $this->adminEmail = config('services.sendgrid.admin_email', 'admin@exceedrobotics.com');
    }

    // ─── Public trigger methods ────────────────────────────────────────────────

    public function leadReceived(array $data): void
    {
        $name     = $data['name'] ?? 'there';
        $email    = $data['email'] ?? '';
        $phone    = $data['phone'] ?? '';
        $ageGroup = $data['age_group'] ?? '';
        $location = $data['location'] ?? '';
        $course   = $data['course'] ?? '';

        SendEmailNotification::dispatch(
            $this->adminEmail, 'Admin',
            "[New Lead] - {$course}",
            $this->buildEmail('Admin', 'New Lead Received', "
                <table style='width:100%;border-collapse:collapse;font-size:14px;'>
                  <tr><td style='padding:6px 0;color:#666;'>Name</td><td><strong>{$name}</strong></td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Email</td><td>{$email}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Phone</td><td>{$phone}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Age Group</td><td>{$ageGroup}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Location</td><td>{$location}</td></tr>
                </table>
            "),
            'lead_received'
        );
    }

    public function userRegistered(array $data): void
    {
        $name  = $data['name'] ?? 'there';
        $email = $data['email'] ?? '';
        $phone = $data['phone'] ?? '';

        if ($email) {
            SendEmailNotification::dispatch(
                $email, $name,
                'Welcome to Exceed Robotics! 🤖',
                $this->buildEmail($name, 'Welcome to Exceed Robotics!', "
                    <p>Your account has been created successfully. You can now:</p>
                    <ul style='margin:12px 0;padding-left:20px;line-height:1.8;'>
                      <li>Browse and book <strong>free trial classes</strong></li>
                      <li>Track your child's enrollments from your dashboard</li>
                      <li>Update your profile and contact details</li>
                    </ul>
                    <p style='margin-top:24px;'>
                      <a href='https://exceedrobotics.com/dashboard' style='background:#1e3f8b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'>
                        Go to Dashboard →
                      </a>
                    </p>
                "),
                'user_registered'
            );
        }

        if ($phone) {
            SendSmsNotification::dispatch(
                $phone,
                "Welcome to Exceed Robotics, {$name}! Your account is ready. Log in at exceedrobotics.com to book your free trial. — Exceed Robotics",
                'user_registered'
            );
        }
    }

    public function enrollmentCreated(array $data): void
    {
        $parentName  = $data['parentName'] ?? 'there';
        $parentEmail = $data['parentEmail'] ?? '';
        $parentPhone = $data['parentPhone'] ?? '';
        $childName   = $data['childName'] ?? 'your child';
        $className   = $data['className'] ?? '';
        $course      = $data['course'] ?? '';
        $location    = $data['location'] ?? '';
        $instructor  = $data['instructor'] ?? '';
        $price       = $data['price'] ?? 0;
        $type        = $data['type'] ?? 'Trial';
        $priceLabel  = $price == 0 ? 'Free' : '$'.number_format($price, 2);

        SendEmailNotification::dispatch(
            $this->adminEmail, 'Admin',
            "[Booking Received] - {$className}",
            $this->buildEmail('Admin', 'New Enrollment Received', "
                <table style='width:100%;border-collapse:collapse;font-size:14px;'>
                  <tr><td style='padding:6px 0;color:#666;'>Parent</td><td><strong>{$parentName}</strong> ({$parentEmail})</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Phone</td><td>{$parentPhone}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Child</td><td>{$childName}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Class</td><td>{$className}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Location</td><td>{$location}</td></tr>
                  <tr><td style='padding:6px 0;color:#666;'>Price</td><td>{$priceLabel}</td></tr>
                </table>
            "),
            'enrollment_created'
        );
    }

    public function enrollmentConfirmed(array $data): void
    {
        $parentName  = $data['parentName'] ?? 'there';
        $parentEmail = $data['parentEmail'] ?? '';
        $parentPhone = $data['parentPhone'] ?? '';
        $childName   = $data['childName'] ?? 'your child';
        $className   = $data['className'] ?? '';
        $location    = $data['location'] ?? '';
        $date        = $data['date'] ?? '';
        $time        = $data['time'] ?? '';
        $dateTime    = trim("{$date} {$time}");

        if ($parentEmail) {
            SendEmailNotification::dispatch(
                $parentEmail, $parentName,
                "[Booking Confirmed] - {$className}",
                $this->buildEmail($parentName, "You're confirmed! 🎉", "
                    <p><strong>{$childName}</strong>'s trial class is officially confirmed. See you there!</p>
                    <table style='width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;'>
                      <tr style='background:#f5f7fa;'><td style='padding:10px 12px;color:#666;'>Class</td><td style='padding:10px 12px;'><strong>{$className}</strong></td></tr>
                      <tr><td style='padding:10px 12px;color:#666;'>Location</td><td style='padding:10px 12px;'>{$location}</td></tr>
                      <tr style='background:#f5f7fa;'><td style='padding:10px 12px;color:#666;'>Date &amp; Time</td><td style='padding:10px 12px;'>{$dateTime}</td></tr>
                    </table>
                    <p style='font-size:13px;color:#666;'>Please bring your child 10 minutes early. Our instructor will guide you from the lobby.</p>
                    <p style='margin-top:24px;'>
                      <a href='https://exceedrobotics.com/dashboard' style='background:#1e3f8b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'>
                        View Dashboard →
                      </a>
                    </p>
                "),
                'enrollment_confirmed'
            );
        }

        if ($parentPhone) {
            SendSmsNotification::dispatch(
                $parentPhone,
                "Confirmed! {$childName}'s {$className} is set at {$location}".($dateTime ? " on {$dateTime}" : '').". See you there! — Exceed Robotics",
                'enrollment_confirmed'
            );
        }
    }

    public function enrollmentCancelled(array $data): void
    {
        $parentName  = $data['parentName'] ?? 'there';
        $parentEmail = $data['parentEmail'] ?? '';
        $parentPhone = $data['parentPhone'] ?? '';
        $childName   = $data['childName'] ?? 'your child';
        $className   = $data['className'] ?? 'the class';

        if ($parentEmail) {
            SendEmailNotification::dispatch(
                $parentEmail, $parentName,
                "Booking cancelled — {$childName}",
                $this->buildEmail($parentName, 'Booking Cancelled', "
                    <p>We're sorry to inform you that <strong>{$childName}</strong>'s booking for <strong>{$className}</strong> has been cancelled.</p>
                    <p>If you'd like to rebook or have any questions, please contact us at <a href='mailto:info@exceedrobotics.com'>info@exceedrobotics.com</a>.</p>
                    <p style='margin-top:24px;'>
                      <a href='https://exceedrobotics.com/search' style='background:#1e3f8b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'>
                        Browse Classes →
                      </a>
                    </p>
                "),
                'enrollment_cancelled'
            );
        }

        if ($parentPhone) {
            SendSmsNotification::dispatch(
                $parentPhone,
                "Your booking for {$childName}'s {$className} has been cancelled. Contact us to rebook. — Exceed Robotics",
                'enrollment_cancelled'
            );
        }
    }

    public function trialNoShow(array $data): void
    {
        $parentName   = $data['parentName']   ?? 'there';
        $parentEmail  = $data['parentEmail']  ?? '';
        $parentPhone  = $data['parentPhone']  ?? '';
        $childName    = $data['childName']    ?? 'your child';
        $course       = $data['course']       ?? '';
        $location     = $data['location']     ?? '';
        $classDate    = $data['classDate']    ?? '';
        $emailSubject = $data['emailSubject'] ?? "We missed {$childName} today!";
        $emailBody    = $data['emailBody']    ?? '';
        $sendSms      = $data['sendSms']      ?? false;
        $smsBody      = $data['smsBody']      ?? '';

        $dateFormatted = $classDate ? date('F j, Y', strtotime($classDate)) : '';

        if ($parentEmail) {
            $bodyHtml = '<p>'.nl2br(htmlspecialchars($emailBody)).'</p>';
            if ($dateFormatted || $location || $course) {
                $bodyHtml .= "
                    <table style='width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;'>
                      ".($childName !== 'your child' ? "<tr style='background:#f5f7fa;'><td style='padding:10px 12px;color:#666;'>Student</td><td style='padding:10px 12px;'><strong>{$childName}</strong></td></tr>" : '')."
                      ".($course    ? "<tr><td style='padding:10px 12px;color:#666;'>Course</td><td style='padding:10px 12px;'>{$course}</td></tr>" : '')."
                      ".($location  ? "<tr style='background:#f5f7fa;'><td style='padding:10px 12px;color:#666;'>Location</td><td style='padding:10px 12px;'>{$location}</td></tr>" : '')."
                      ".($dateFormatted ? "<tr><td style='padding:10px 12px;color:#666;'>Class Date</td><td style='padding:10px 12px;'>{$dateFormatted}</td></tr>" : '')."
                    </table>
                ";
            }
            $bodyHtml .= "
                <p style='margin-top:24px;'>
                  <a href='https://exceedrobotics.com/search' style='background:#1e3f8b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'>
                    Book Another Class →
                  </a>
                </p>
            ";

            SendEmailNotification::dispatch(
                $parentEmail, $parentName,
                $emailSubject,
                $this->buildEmail($parentName, $emailSubject, $bodyHtml),
                'trial_no_show'
            );
        }

        if ($sendSms && $parentPhone && $smsBody) {
            SendSmsNotification::dispatch($parentPhone, $smsBody, 'trial_no_show');
        }
    }

    public function classReminder(array $data): void
    {
        $parentName  = $data['parentName'] ?? 'there';
        $parentEmail = $data['parentEmail'] ?? '';
        $parentPhone = $data['parentPhone'] ?? '';
        $childName   = $data['childName'] ?? 'your child';
        $className   = $data['className'] ?? '';
        $location    = $data['location'] ?? '';
        $time        = $data['time'] ?? '';

        if ($parentEmail) {
            SendEmailNotification::dispatch(
                $parentEmail, $parentName,
                "Reminder: {$childName}'s class is tomorrow!",
                $this->buildEmail($parentName, "Class tomorrow! 🤖", "
                    <p>Just a reminder that <strong>{$childName}</strong>'s class is <strong>tomorrow</strong>!</p>
                    <table style='width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;'>
                      <tr style='background:#f5f7fa;'><td style='padding:10px 12px;color:#666;'>Class</td><td style='padding:10px 12px;'><strong>{$className}</strong></td></tr>
                      <tr><td style='padding:10px 12px;color:#666;'>Location</td><td style='padding:10px 12px;'>{$location}</td></tr>
                      ".($time ? "<tr style='background:#f5f7fa;'><td style='padding:10px 12px;color:#666;'>Time</td><td style='padding:10px 12px;'>{$time}</td></tr>" : '')."
                    </table>
                    <p style='font-size:13px;color:#666;'>Please arrive 10 minutes early. See you tomorrow!</p>
                "),
                'class_reminder'
            );
        }

        if ($parentPhone) {
            SendSmsNotification::dispatch(
                $parentPhone,
                "Reminder: {$childName}'s {$className} is tomorrow".($time ? " at {$time}" : '').", {$location}. See you there! 🤖 — Exceed Robotics",
                'class_reminder'
            );
        }
    }

    /**
     * Fire all active custom workflows that match a given event key.
     * Called automatically from controllers when a built-in event fires.
     */
    public function fireEventWorkflows(string $eventKey, array $data): void
    {
        $workflows = CustomWorkflow::where('trigger_type', 'event')
            ->where('event_key', $eventKey)
            ->where('active', true)
            ->get();

        foreach ($workflows as $wf) {
            // Skip if workflow has a location condition that doesn't match
            if ($wf->condition_location && $wf->condition_location !== ($data['location'] ?? '')) {
                continue;
            }
            // Skip if workflow has a course condition that doesn't match
            if ($wf->condition_course && $wf->condition_course !== ($data['course'] ?? '')) {
                continue;
            }
            $this->fireCustomWorkflow($wf, $data);
        }
    }

    /**
     * Execute a single custom workflow definition against one recipient.
     * data: parentName, parentEmail, parentPhone
     */
    public function fireCustomWorkflow(CustomWorkflow $wf, array $data): void
    {
        $parentName  = $data['parentName']  ?? 'there';
        $parentEmail = $data['parentEmail'] ?? '';
        $parentPhone = $data['parentPhone'] ?? '';
        $event       = $wf->event_key ?: 'custom_'.$wf->id;

        if ($wf->email_enabled && $wf->email_subject) {
            $recipients = match($wf->email_recipient) {
                'admin' => [[$this->adminEmail, 'Admin']],
                'both'  => [[$parentEmail, $parentName], [$this->adminEmail, 'Admin']],
                default => [[$parentEmail, $parentName]],
            };

            $html = $this->buildEmail($parentName, $wf->email_subject, '<p>'.nl2br(htmlspecialchars($wf->email_body ?? '')).'</p>');

            foreach ($recipients as [$toEmail, $toName]) {
                if ($toEmail) {
                    SendEmailNotification::dispatch($toEmail, $toName, $wf->email_subject, $html, $event);
                }
            }
        }

        if ($wf->sms_enabled && $wf->sms_body) {
            $smsTo = $wf->sms_recipient === 'admin' ? '' : $parentPhone;
            if ($smsTo) {
                SendSmsNotification::dispatch($smsTo, $wf->sms_body, $event);
            }
        }
    }

    // ─── Email template builder ────────────────────────────────────────────────

    private function buildEmail(string $name, string $heading, string $body): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <tr>
                  <td style="background:#1e3f8b;border-radius:12px 12px 0 0;padding:28px 36px;">
                    <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Exceed Robotics</span>
                    <span style="display:block;color:#93c5fd;font-size:13px;margin-top:2px;">exceedrobotics.com</span>
                  </td>
                </tr>
                <tr>
                  <td style="background:#fff;padding:36px 36px 28px;">
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;">{$heading}</h1>
                    <p style="margin:0 0 20px;font-size:15px;color:#555;">Hi {$name},</p>
                    <div style="font-size:15px;color:#374151;line-height:1.7;">{$body}</div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 36px;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:13px;color:#9ca3af;">
                      Questions? Email us at <a href="mailto:info@exceedrobotics.com" style="color:#1e3f8b;">info@exceedrobotics.com</a>
                    </p>
                    <p style="margin:6px 0 0;font-size:12px;color:#d1d5db;">© 2026 Exceed Robotics. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        HTML;
    }
}
