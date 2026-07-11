<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Publishes continuing-education class schedules as a standard .ics feed so
 * parents/institutions can subscribe from Google/Outlook/Apple Calendar.
 */
class CalendarController extends Controller
{
    public function feed(Request $request): Response
    {
        $query = SchoolClass::where('type', 'Paid')->whereNotNull('date');

        if ($request->filled('course')) {
            $query->where('course', $request->query('course'));
        }

        $classes = $query->get();

        $lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Exceed Robotics//Continuing Education//EN', 'CALSCALE:GREGORIAN'];

        foreach ($classes as $cls) {
            $start = $this->parseStart($cls->date, $cls->time);
            if (!$start) continue;
            $end = $start->copy()->addHour();

            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:school-class-' . $cls->id . '@exceedrobotics.com';
            $lines[] = 'DTSTAMP:' . Carbon::now('UTC')->format('Ymd\THis\Z');
            $lines[] = 'DTSTART:' . $start->copy()->utc()->format('Ymd\THis\Z');
            $lines[] = 'DTEND:' . $end->copy()->utc()->format('Ymd\THis\Z');
            $lines[] = 'SUMMARY:' . $this->escape($cls->curriculum);
            $lines[] = 'LOCATION:' . $this->escape(implode(', ', $cls->locations ?? []));
            $lines[] = 'DESCRIPTION:' . $this->escape("{$cls->course} with {$cls->instructor}");
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        return response(implode("\r\n", $lines), 200, [
            'Content-Type'        => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="continuing-education-classes.ics"',
        ]);
    }

    private function parseStart(?string $date, ?string $time): ?Carbon
    {
        if (!$date) return null;
        try {
            return Carbon::parse(trim($date . ' ' . ($time ?? '00:00')));
        } catch (\Exception) {
            return Carbon::parse($date);
        }
    }

    private function escape(string $value): string
    {
        return str_replace([',', ';'], ['\,', '\;'], $value);
    }
}
